using System.Reflection;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;
using Orvexa.Core;
using Windows.Graphics;
using Windows.System;

namespace Orvexa.App;

public sealed partial class MainWindow : Window
{
    readonly WingetService winget=new();
    readonly DeviceService devices=new();
    readonly ActivityService activity=new();
    readonly InstalledService installed=new();
    readonly SettingsService settings=new();
    readonly CatalogCacheService cache=new();
    readonly HealthService health=new();
    readonly OperationGuard operationGuard=new();
    readonly UpdateScanService updateScan=new();
    readonly ConfirmationPolicy confirmations=new();
    readonly CrashLogService crashLog=new();
    readonly WindowStateService windowState=new();
    readonly FavoritesService favorites=new();
    readonly ProtocolService protocol=new();
    readonly CatalogResolverService catalogResolver=new();
    readonly CatalogSeedService catalogSeed=new();
    readonly DispatcherTimer activationTimer=new();

    CancellationTokenSource? operationCts;
    bool suppressNavigationRefresh;
    bool confirmationOpen;
    IReadOnlyList<PackageItem> catalogItems=[];
    IReadOnlyList<AvailableUpdate> updateItems=[];
    IReadOnlyList<InstalledPackage> installedItems=[];
    readonly string? initialProtocol;
    bool activationHandling;

    public MainWindow(string? initialProtocol=null)
    {
        this.initialProtocol=initialProtocol;
        InitializeComponent();
        ApplyWindowBranding();
        ApplyVersionText();
        RestoreWindowState();
        RefreshDevice();
        LoadSettingsToUi();
        Nav.SelectedItem=Nav.MenuItems[0];
        ShellContent.Loaded+=ShellContent_Loaded;
        activationTimer.Interval=TimeSpan.FromSeconds(1);
        activationTimer.Tick+=ActivationTimer_Tick;
        activationTimer.Start();
        Closed+=(_,_)=>
        {
            activationTimer.Stop();
            operationCts?.Cancel();
            SaveWindowState();
        };
    }




    async void ShellContent_Loaded(object sender,RoutedEventArgs e)
    {
        if(initialProtocol is not null) await HandleProtocolAsync(initialProtocol);
    }

    async void ActivationTimer_Tick(object? sender,object e)
    {
        if(activationHandling || Busy.IsActive || confirmationOpen) return;
        var pending=protocol.TakePending();
        if(pending is null) return;

        activationHandling=true;
        try
        {
            Activate();
            await HandleProtocolAsync(pending);
        }
        finally { activationHandling=false; }
    }

    async Task HandleProtocolAsync(string value)
    {
        if(Busy.IsActive || confirmationOpen)
        {
            protocol.Queue(value);
            return;
        }

        if(!protocol.TryParseInstall(value,out var ids))
        {
            QueueStatus.Text="The Orvexa link is invalid or contains no supported package IDs.";
            return;
        }

        var catalogPath=Path.Combine(AppContext.BaseDirectory,"data","catalog.json");
        if(!File.Exists(catalogPath))
        {
            QueueStatus.Text="The local Orvexa catalog is unavailable.";
            return;
        }

        IReadOnlyList<ResolvedPackage> packages;
        try { packages=catalogResolver.Resolve(ids,File.ReadAllText(catalogPath)); }
        catch(Exception ex)
        {
            crashLog.Write(ex);
            QueueStatus.Text="The Orvexa selection could not be validated.";
            return;
        }

        if(packages.Count==0)
        {
            QueueStatus.Text="None of the requested packages are available in the trusted catalog.";
            return;
        }

        var names=string.Join(Environment.NewLine,packages.Take(8).Select(x=>"- "+x.Name));
        if(packages.Count>8) names+=Environment.NewLine+$"- and {packages.Count-8} more";
        var skipped=ids.Count-packages.Count;
        var message=$"Install {packages.Count} validated package(s)?{Environment.NewLine}{Environment.NewLine}{names}";
        if(skipped>0) message+=Environment.NewLine+Environment.NewLine+$"{skipped} unsupported selection(s) were ignored.";

        if(!await ConfirmActionAsync("Install Orvexa selection",message,"Install")) return;

        await RunOperationAsync("Installing validated Orvexa selection...",async ct=>{
            var queue=packages.Select(x=>new QueueItem(x.WingetId)).ToArray();
            var progress=new Progress<(int Done,int Total,string Id)>(p=>QueueStatus.Text=$"{p.Done}/{p.Total} | {p.Id}");
            var results=await new QueueService(winget).RunAsync(queue,progress,ct);
            foreach(var result in results)
                activity.Add(new(DateTimeOffset.Now,result.PackageId,"install",result.Success?"success":"failed",result.Detail));
            QueueStatus.Text=$"Installed {results.Count(x=>x.Success)}/{results.Count} validated package(s).";
        });
    }

    void ApplyVersionText()
    {
        var info=typeof(MainWindow).Assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?
            .InformationalVersion;
        var version=string.IsNullOrWhiteSpace(info)
            ? typeof(MainWindow).Assembly.GetName().Version?.ToString(3) ?? "0.0.1"
            : info.Split('+')[0];
        VersionText.Text=$"Version {version}";
    }

    void OpenCatalog_Click(object sender,RoutedEventArgs e)=>SelectNavigation("catalog");

    void OpenInstalled_Click(object sender,RoutedEventArgs e)=>SelectNavigation("installed");

    void ApplyWindowBranding()
    {
        try
        {
            var icon=Path.Combine(AppContext.BaseDirectory,"Assets","Orvexa.ico");
            if(File.Exists(icon)) AppWindow.SetIcon(icon);
        }
        catch(Exception ex){crashLog.Write(ex);}
    }

    void RestoreWindowState()
    {
        try
        {
            var value=windowState.Read();
            AppWindow.Resize(new SizeInt32(value.Width,value.Height));
        }
        catch(Exception ex){crashLog.Write(ex);}
    }

    void SaveWindowState()
    {
        try
        {
            var size=AppWindow.Size;
            windowState.Save(new WindowState(size.Width,size.Height));
        }
        catch(Exception ex){crashLog.Write(ex);}
    }

    void RefreshDevice()
    {
        try
        {
            var p=devices.Detect();
            var deviceLabel=string.Join(" ",new[]{p.Manufacturer,p.Model}.Where(x=>!string.IsNullOrWhiteSpace(x)));
            var text=string.IsNullOrWhiteSpace(deviceLabel)?p.Windows:$"{deviceLabel} | {p.Windows}";
            DeviceText.Text=text;
            DeviceDetails.Text=text;
            ArchitectureText.Text=$"Architecture: {p.Architecture}";
            LoadRecommendations(p);
        }
        catch(Exception ex)
        {
            crashLog.Write(ex);
            QueueStatus.Text="Device information could not be loaded.";
        }
    }

    void LoadRecommendations(DeviceProfile p)
    {
        try
        {
            var profilePath=Path.Combine(AppContext.BaseDirectory,"data","device-profiles.json");
            var catalogPath=Path.Combine(AppContext.BaseDirectory,"data","catalog.json");
            if(!File.Exists(profilePath) || !File.Exists(catalogPath))
            {
                Recommendations.ItemsSource=Array.Empty<ResolvedPackage>();
                return;
            }

            var ids=new RecommendationService().ForDevice(p,File.ReadAllText(profilePath));
            Recommendations.ItemsSource=catalogResolver.Resolve(ids,File.ReadAllText(catalogPath));
        }
        catch(Exception ex)
        {
            crashLog.Write(ex);
            Recommendations.ItemsSource=Array.Empty<ResolvedPackage>();
        }
    }

    async Task RunOperationAsync(string status,Func<CancellationToken,Task> action)
    {
        if(Busy.IsActive){QueueStatus.Text="Another operation is already running.";return;}
        operationCts=new CancellationTokenSource();
        Busy.IsActive=true;
        CancelButton.Visibility=Visibility.Visible;
        QueueStatus.Text=status;
        try
        {
            await operationGuard.RunAsync(action,operationCts.Token);
        }
        catch(OperationCanceledException)
        {
            QueueStatus.Text="Operation cancelled.";
        }
        catch(Exception ex)
        {
            crashLog.Write(ex);
            QueueStatus.Text="The operation could not be completed.";
        }
        finally
        {
            Busy.IsActive=false;
            CancelButton.Visibility=Visibility.Collapsed;
            operationCts.Dispose();
            operationCts=null;
        }
    }

    async Task<bool> ConfirmAsync(PackageAction action,string title,string message,string primary)
    {
        if(!confirmations.RequiresConfirmation(action,settings.Read())) return true;
        return await ConfirmActionAsync(title,message,primary);
    }

    async Task<bool> ConfirmActionAsync(string title,string message,string primary)
    {
        if(Busy.IsActive){QueueStatus.Text="Finish or cancel the current operation first.";return false;}
        if(confirmationOpen || Content is not FrameworkElement root || root.XamlRoot is null) return false;

        confirmationOpen=true;
        try
        {
            var dialog=new ContentDialog
            {
                XamlRoot=root.XamlRoot,
                Title=title,
                Content=message,
                PrimaryButtonText=primary,
                CloseButtonText="Cancel",
                DefaultButton=ContentDialogButton.Close
            };
            return await dialog.ShowAsync()==ContentDialogResult.Primary;
        }
        catch(Exception ex)
        {
            crashLog.Write(ex);
            QueueStatus.Text="Confirmation could not be opened.";
            return false;
        }
        finally { confirmationOpen=false; }
    }

    void Cancel_Click(object sender,RoutedEventArgs e)=>operationCts?.Cancel();

    async void Search_Click(object sender,RoutedEventArgs e)=>await ExecuteSearchAsync();

    async void SearchBox_KeyDown(object sender,KeyRoutedEventArgs e)
    {
        if(e.Key!=VirtualKey.Enter) return;
        e.Handled=true;
        await ExecuteSearchAsync();
    }

    void EnsureCatalogLoaded()
    {
        if(CatalogResults.ItemsSource is not null) return;

        try
        {
            var catalogPath=Path.Combine(AppContext.BaseDirectory,"data","catalog.json");
            if(!File.Exists(catalogPath))
            {
                CatalogEmptyState.Visibility=Visibility.Visible;
                return;
            }

            catalogItems=catalogSeed.FromBundledCatalog(File.ReadAllText(catalogPath));
            cache.Merge(catalogItems);
            ApplyCatalogFilter();
            QueueStatus.Text=$"Catalog ready | {catalogItems.Count} curated packages";
        }
        catch(Exception ex)
        {
            crashLog.Write(ex);
            CatalogEmptyState.Visibility=Visibility.Visible;
            QueueStatus.Text="The local catalog could not be loaded.";
        }
    }

    async Task ExecuteSearchAsync()
    {
        var query=PackagePolicy.NormalizeQuery(SearchBox.Text);
        if(query.Length<2){QueueStatus.Text="Enter at least two characters.";return;}
        InstallSelectedButton.IsEnabled=false;
        CatalogResults.SelectedItems.Clear();

        await RunOperationAsync("Searching catalog...",async ct=>{
            var limit=settings.Read().SearchLimit;
            var local=cache.Search(query,0,limit);
            var live=await winget.SearchAsync(query,limit,ct);
            if(live.Count>0) cache.Merge(live);

            catalogItems=local
                .Concat(live)
                .GroupBy(x=>x.Id,StringComparer.OrdinalIgnoreCase)
                .Select(x=>x.First())
                .OrderBy(x=>x.Name.StartsWith(query,StringComparison.OrdinalIgnoreCase)?0:1)
                .ThenBy(x=>x.Name,StringComparer.OrdinalIgnoreCase)
                .Take(limit)
                .ToArray();

            ApplyCatalogFilter();
            QueueStatus.Text=catalogItems.Count==0
                ? "No matching software found."
                : $"{catalogItems.Count} result(s) ready";
        });
    }

    void CatalogResults_SelectionChanged(object sender,SelectionChangedEventArgs e)
    {
        var hasSelection=CatalogResults.SelectedItems.Count>0;
        InstallSelectedButton.IsEnabled=hasSelection;
        FavoriteSelectedButton.IsEnabled=hasSelection;
    }

    void ApplyCatalogFilter()
    {
        IReadOnlyList<PackageItem> visible;
        if(FavoritesOnlyToggle.IsChecked!=true)
            visible=catalogItems;
        else
        {
            var ids=favorites.Read();
            visible=catalogItems.Where(x=>ids.Contains(x.Id)).ToArray();
        }

        CatalogResults.ItemsSource=visible;
        CatalogEmptyState.Visibility=visible.Count==0?Visibility.Visible:Visibility.Collapsed;
    }

    void FavoritesOnly_Click(object sender,RoutedEventArgs e)
    {
        CatalogResults.SelectedItems.Clear();
        ApplyCatalogFilter();
        QueueStatus.Text=FavoritesOnlyToggle.IsChecked==true?"Showing favorites only.":"Showing all catalog results.";
    }

    void FavoriteSelected_Click(object sender,RoutedEventArgs e)
    {
        var selected=CatalogResults.SelectedItems.Cast<PackageItem>().ToArray();
        if(selected.Length==0){QueueStatus.Text="Select one or more packages first.";return;}
        try
        {
            foreach(var item in selected) favorites.Toggle(item.Id);
            CatalogResults.SelectedItems.Clear();
            ApplyCatalogFilter();
            QueueStatus.Text=$"Updated favorites for {selected.Length} package(s).";
        }
        catch(Exception ex)
        {
            crashLog.Write(ex);
            QueueStatus.Text="Favorites could not be updated.";
        }
    }

    async void Recommendation_Click(object sender,RoutedEventArgs e)
    {
        var catalogId=(sender as Button)?.Tag?.ToString();
        if(!PackagePolicy.IsSafeId(catalogId)) return;

        var catalogPath=Path.Combine(AppContext.BaseDirectory,"data","catalog.json");
        if(!File.Exists(catalogPath)) return;
        var resolved=catalogResolver.Resolve([catalogId],File.ReadAllText(catalogPath)).FirstOrDefault();
        if(resolved is null) return;

        SearchBox.Text=resolved.Name;
        SelectNavigation("catalog");
        await ExecuteSearchAsync();
    }

    void UpdateResults_SelectionChanged(object sender,SelectionChangedEventArgs e)=>
        UpdateSelectedButton.IsEnabled=UpdateResults.SelectedItems.Count>0;

    void InstalledResults_SelectionChanged(object sender,SelectionChangedEventArgs e)=>
        UninstallSelectedButton.IsEnabled=InstalledResults.SelectedItems.Count>0;

    void UpdateSearchBox_TextChanged(object sender,TextChangedEventArgs e)
    {
        UpdateResults.SelectedItems.Clear();
        UpdateSelectedButton.IsEnabled=false;
        ApplyUpdateFilter();
    }

    void InstalledSearchBox_TextChanged(object sender,TextChangedEventArgs e)
    {
        InstalledResults.SelectedItems.Clear();
        UninstallSelectedButton.IsEnabled=false;
        ApplyInstalledFilter();
    }

    void ApplyUpdateFilter()
    {
        var query=NormalizeLocalFilter(UpdateSearchBox.Text);
        var visible=string.IsNullOrWhiteSpace(query)
            ? updateItems
            : updateItems.Where(x=>
                x.Name.Contains(query,StringComparison.OrdinalIgnoreCase) ||
                x.Id.Contains(query,StringComparison.OrdinalIgnoreCase))
              .ToArray();

        UpdateResults.ItemsSource=visible;
        UpdatesEmptyState.Visibility=visible.Count==0?Visibility.Visible:Visibility.Collapsed;
    }

    void ApplyInstalledFilter()
    {
        var query=NormalizeLocalFilter(InstalledSearchBox.Text);
        var visible=string.IsNullOrWhiteSpace(query)
            ? installedItems
            : installedItems.Where(x=>
                x.Name.Contains(query,StringComparison.OrdinalIgnoreCase) ||
                x.Id.Contains(query,StringComparison.OrdinalIgnoreCase))
              .ToArray();

        InstalledResults.ItemsSource=visible;
        InstalledEmptyState.Visibility=visible.Count==0?Visibility.Visible:Visibility.Collapsed;
    }

    static string NormalizeLocalFilter(string? value)
    {
        var text=(value??"").Trim();
        if(text.Length>120) text=text[..120];
        return new string(text.Where(c=>!char.IsControl(c)).ToArray());
    }

    async void BuildIndex_Click(object sender,RoutedEventArgs e)
    {
        await RunOperationAsync("Refreshing local catalog...",async ct=>{
            ct.ThrowIfCancellationRequested();
            var catalogPath=Path.Combine(AppContext.BaseDirectory,"data","catalog.json");
            if(!File.Exists(catalogPath))
            {
                QueueStatus.Text="The bundled Orvexa catalog is unavailable.";
                return;
            }

            var packages=catalogSeed.FromBundledCatalog(await File.ReadAllTextAsync(catalogPath,ct));
            cache.Merge(packages);
            catalogItems=packages;
            ApplyCatalogFilter();
            QueueStatus.Text=$"Local catalog refreshed | {cache.Read().Packages.Count} cached packages";
        });
    }

    async void InstallSelected_Click(object sender,RoutedEventArgs e)
    {
        var selected=CatalogResults.SelectedItems.Cast<PackageItem>().Select(x=>new QueueItem(x.Id)).ToArray();
        if(selected.Length==0){QueueStatus.Text="Select one or more packages first.";return;}
        if(!await ConfirmAsync(PackageAction.Install,"Install selected software",$"Install {selected.Length} selected package(s)?","Install")) return;

        await RunOperationAsync("Installing selected software...",async ct=>{
            var progress=new Progress<(int Done,int Total,string Id)>(p=>QueueStatus.Text=$"{p.Done}/{p.Total} | {p.Id}");
            var results=await new QueueService(winget).RunAsync(selected,progress,ct);
            foreach(var r in results) activity.Add(new(DateTimeOffset.Now,r.PackageId,"install",r.Success?"success":"failed",r.Detail));
            QueueStatus.Text=$"Installed {results.Count(x=>x.Success)}/{results.Count}";
        });
    }

    async void ScanUpdates_Click(object sender,RoutedEventArgs e)
    {
        suppressNavigationRefresh=true;
        SelectNavigation("updates");
        suppressNavigationRefresh=false;
        await RefreshUpdatesAsync();
    }

    async Task RefreshUpdatesAsync()
    {
        await RunOperationAsync("Checking for updates...",async ct=>{
            updateItems=await updateScan.ScanAsync(ct);
            UpdateResults.SelectedItems.Clear();
            UpdateSelectedButton.IsEnabled=false;
            UpdateAllButton.IsEnabled=updateItems.Count>0;
            ApplyUpdateFilter();
            QueueStatus.Text=updateItems.Count==0?"No updates available":$"{updateItems.Count} updates available";
        });
    }

    async void UpdateSelected_Click(object sender,RoutedEventArgs e)
    {
        var selected=UpdateResults.SelectedItems.Cast<AvailableUpdate>().Select(x=>new QueueItem(x.Id,true)).ToArray();
        if(selected.Length==0){QueueStatus.Text="Select one or more updates first.";return;}
        if(!await ConfirmAsync(PackageAction.Update,"Update selected software",$"Update {selected.Length} selected package(s)?","Update")) return;

        await RunOperationAsync("Updating selected software...",async ct=>{
            var progress=new Progress<(int Done,int Total,string Id)>(p=>QueueStatus.Text=$"{p.Done}/{p.Total} | {p.Id}");
            var results=await new QueueService(winget).RunAsync(selected,progress,ct);
            foreach(var r in results) activity.Add(new(DateTimeOffset.Now,r.PackageId,"update",r.Success?"success":"failed",r.Detail));
            updateItems=await updateScan.ScanAsync(ct);
            UpdateResults.SelectedItems.Clear();
            UpdateSelectedButton.IsEnabled=false;
            UpdateAllButton.IsEnabled=updateItems.Count>0;
            ApplyUpdateFilter();
            QueueStatus.Text=$"Updated {results.Count(x=>x.Success)}/{results.Count} | {updateItems.Count} remaining";
        });
    }

    async void UpdateAll_Click(object sender,RoutedEventArgs e)
    {
        if(!await ConfirmAsync(PackageAction.UpdateAll,"Update all software","Install every available update reported by Windows Package Manager?","Update all")) return;
        await RunOperationAsync("Updating all software...",async ct=>{
            var r=await winget.UpdateAllAsync(ct);
            activity.Add(new(DateTimeOffset.Now,"*","update-all",r.Code==0?"success":"failed",r.Code==0?r.Output:r.Error));
            updateItems=await updateScan.ScanAsync(ct);
            UpdateResults.SelectedItems.Clear();
            UpdateSelectedButton.IsEnabled=false;
            UpdateAllButton.IsEnabled=updateItems.Count>0;
            ApplyUpdateFilter();
            QueueStatus.Text=r.Code==0?$"Update all completed | {updateItems.Count} remaining":"Update all finished with errors.";
        });
    }

    async void Installed_Click(object sender,RoutedEventArgs e)=>await RefreshInstalledAsync();

    async Task RefreshInstalledAsync()
    {
        await RunOperationAsync("Loading installed software...",async ct=>{
            installedItems=await installed.GetInstalledAsync(ct);
            InstalledResults.SelectedItems.Clear();
            UninstallSelectedButton.IsEnabled=false;
            ApplyInstalledFilter();
            QueueStatus.Text=$"{installedItems.Count} installed packages detected";
        });
    }

    async void UninstallSelected_Click(object sender,RoutedEventArgs e)
    {
        var selected=InstalledResults.SelectedItems.Cast<InstalledPackage>().ToArray();
        if(selected.Length==0){QueueStatus.Text="Select one or more installed packages first.";return;}
        if(!await ConfirmAsync(PackageAction.Uninstall,"Uninstall selected software",$"Uninstall {selected.Length} selected package(s)? This can remove application data controlled by those applications.","Uninstall")) return;

        await RunOperationAsync("Uninstalling selected software...",async ct=>{
            var done=0;
            var ok=0;
            foreach(var item in selected)
            {
                ct.ThrowIfCancellationRequested();
                var r=await winget.UninstallAsync(item.Id,ct);
                done++;
                if(r.Code==0)ok++;
                activity.Add(new(DateTimeOffset.Now,item.Id,"uninstall",r.Code==0?"success":"failed",r.Code==0?r.Output:r.Error));
                QueueStatus.Text=$"{done}/{selected.Length} | {item.Id}";
            }
            QueueStatus.Text=$"Uninstalled {ok}/{selected.Length}";
            await RefreshInstalledListWithoutBusyAsync(ct);
        });
    }

    async Task RefreshInstalledListWithoutBusyAsync(CancellationToken ct)
    {
        installedItems=await installed.GetInstalledAsync(ct);
        InstalledResults.SelectedItems.Clear();
        UninstallSelectedButton.IsEnabled=false;
        ApplyInstalledFilter();
    }

    async void Health_Click(object sender,RoutedEventArgs e)
    {
        await RunOperationAsync("Checking system health...",async ct=>{
            var h=await health.GetAsync(ct);
            var summary=h.WingetAvailable
                ? $"WinGet: {h.WingetVersion} | Orvexa memory: {h.WorkingSetMB} MB | Free disk: {h.FreeDiskMB/1024.0:F1} GB"
                : $"WinGet: Unavailable | Orvexa memory: {h.WorkingSetMB} MB | Free disk: {h.FreeDiskMB/1024.0:F1} GB";
            HealthDetails.Text=summary;
            QueueStatus.Text=summary;
        });
    }

    void Device_Click(object sender,RoutedEventArgs e)
    {
        RefreshDevice();
        QueueStatus.Text="Device information refreshed.";
    }

    async void ClearActivity_Click(object sender,RoutedEventArgs e)
    {
        if(!await ConfirmActionAsync("Clear activity history","Remove the local Orvexa activity history from this PC?","Clear")) return;
        activity.Clear();
        ActivityList.ItemsSource=Array.Empty<ActivityItem>();
        ActivityEmptyState.Visibility=Visibility.Visible;
        QueueStatus.Text="Activity history cleared.";
    }

    async void Nav_SelectionChanged(NavigationView sender,NavigationViewSelectionChangedEventArgs args)
    {
        var tag=(args.SelectedItemContainer as NavigationViewItem)?.Tag?.ToString()??"home";
        ShowSection(tag);

        if(tag=="catalog") EnsureCatalogLoaded();
        if(tag=="activity") LoadActivity();
        if(tag=="settings") LoadSettingsToUi();

        var auto=settings.Read().AutoRefresh;
        if(!suppressNavigationRefresh && auto && tag=="updates" && UpdateResults.ItemsSource is null) await RefreshUpdatesAsync();
        if(!suppressNavigationRefresh && auto && tag=="installed" && InstalledResults.ItemsSource is null) await RefreshInstalledAsync();
    }

    void LoadActivity()
    {
        var items=activity.Read();
        ActivityList.ItemsSource=items;
        ActivityEmptyState.Visibility=items.Count==0?Visibility.Visible:Visibility.Collapsed;
    }

    void ShowSection(string tag)
    {
        HomeView.Visibility=tag=="home"?Visibility.Visible:Visibility.Collapsed;
        CatalogView.Visibility=tag=="catalog"?Visibility.Visible:Visibility.Collapsed;
        UpdatesView.Visibility=tag=="updates"?Visibility.Visible:Visibility.Collapsed;
        InstalledView.Visibility=tag=="installed"?Visibility.Visible:Visibility.Collapsed;
        DeviceView.Visibility=tag=="device"?Visibility.Visible:Visibility.Collapsed;
        ActivityView.Visibility=tag=="activity"?Visibility.Visible:Visibility.Collapsed;
        SettingsView.Visibility=tag=="settings"?Visibility.Visible:Visibility.Collapsed;
        AboutView.Visibility=tag=="about"?Visibility.Visible:Visibility.Collapsed;
    }

    void SelectNavigation(string tag)
    {
        foreach(var item in Nav.MenuItems.Concat(Nav.FooterMenuItems).OfType<NavigationViewItem>())
        {
            if(string.Equals(item.Tag?.ToString(),tag,StringComparison.OrdinalIgnoreCase))
            {
                Nav.SelectedItem=item;
                return;
            }
        }
    }

    void LoadSettingsToUi()
    {
        var value=settings.Read();
        ConfirmInstall.IsChecked=value.ConfirmBeforeInstall;
        AutoRefresh.IsChecked=value.AutoRefresh;
        SearchLimitBox.Value=value.SearchLimit;

        foreach(var item in ThemeBox.Items.OfType<ComboBoxItem>())
        {
            if(string.Equals(item.Tag?.ToString(),value.Theme,StringComparison.OrdinalIgnoreCase))
            {
                ThemeBox.SelectedItem=item;
                break;
            }
        }
        ApplyTheme(value.Theme);
    }

    async void ResetSettings_Click(object sender,RoutedEventArgs e)
    {
        if(!await ConfirmActionAsync("Reset settings","Restore Orvexa settings to their default values?","Reset")) return;
        try
        {
            settings.Save(new AppSettings());
            LoadSettingsToUi();
            QueueStatus.Text="Settings reset to defaults.";
        }
        catch(Exception ex)
        {
            crashLog.Write(ex);
            QueueStatus.Text="Settings could not be reset.";
        }
    }

    async void ViewLicense_Click(object sender,RoutedEventArgs e)
    {
        if(confirmationOpen || Content is not FrameworkElement root || root.XamlRoot is null) return;
        confirmationOpen=true;
        try
        {
            var viewer=new ScrollViewer
            {
                MaxHeight=480,
                Content=new TextBlock
                {
                    Text=LicenseService.Text,
                    TextWrapping=TextWrapping.Wrap,
                    IsTextSelectionEnabled=true
                }
            };
            var dialog=new ContentDialog
            {
                XamlRoot=root.XamlRoot,
                Title="Orvexa license",
                Content=viewer,
                CloseButtonText="Close"
            };
            await dialog.ShowAsync();
        }
        catch(Exception ex)
        {
            crashLog.Write(ex);
            QueueStatus.Text="License could not be opened.";
        }
        finally { confirmationOpen=false; }
    }

    void SaveSettings_Click(object sender,RoutedEventArgs e)
    {
        try
        {
            var theme=(ThemeBox.SelectedItem as ComboBoxItem)?.Tag?.ToString()??"system";
            var limit=double.IsNaN(SearchLimitBox.Value)?100:(int)SearchLimitBox.Value;
            var value=new AppSettings(theme,ConfirmInstall.IsChecked==true,AutoRefresh.IsChecked==true,limit);
            settings.Save(value);
            ApplyTheme(theme);
            QueueStatus.Text="Settings saved.";
        }
        catch(Exception ex)
        {
            crashLog.Write(ex);
            QueueStatus.Text="Settings could not be saved.";
        }
    }

    void ApplyTheme(string theme)
    {
        if(Content is not FrameworkElement root) return;
        root.RequestedTheme=theme switch
        {
            "light"=>ElementTheme.Light,
            "dark"=>ElementTheme.Dark,
            _=>ElementTheme.Default
        };
    }
}