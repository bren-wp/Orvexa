using System.Text;
using System.Text.Json;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Media.Imaging;

namespace Orvexa.App;

internal sealed record CatalogPresentationItem(string Description,string Category,string IconFile);

internal static class CatalogPresentation
{
    const long MaxCatalogBytes=16L*1024*1024;
    static readonly Lazy<IReadOnlyDictionary<string,CatalogPresentationItem>> items=new(Load);

    public static CatalogPresentationItem? Find(string? packageId)
    {
        if(string.IsNullOrWhiteSpace(packageId)) return null;
        return items.Value.TryGetValue(packageId,out var item)?item:null;
    }

    static IReadOnlyDictionary<string,CatalogPresentationItem> Load()
    {
        var result=new Dictionary<string,CatalogPresentationItem>(StringComparer.OrdinalIgnoreCase);
        try
        {
            var path=Path.Combine(AppContext.BaseDirectory,"data","catalog.json");
            if(!File.Exists(path)) return result;

            using var stream=new FileStream(path,FileMode.Open,FileAccess.Read,FileShare.Read,4096,FileOptions.SequentialScan);
            if(stream.Length<0 || stream.Length>MaxCatalogBytes) return result;

            using var memory=new MemoryStream((int)Math.Min(stream.Length,MaxCatalogBytes));
            var buffer=new byte[8192];
            long total=0;
            while(true)
            {
                var read=stream.Read(buffer,0,buffer.Length);
                if(read<=0) break;
                total+=read;
                if(total>MaxCatalogBytes) return result;
                memory.Write(buffer,0,read);
            }

            var json=new UTF8Encoding(false,true).GetString(memory.ToArray());
            using var document=JsonDocument.Parse(json);
            if(!document.RootElement.TryGetProperty("apps",out var apps) || apps.ValueKind!=JsonValueKind.Array)
                return result;

            foreach(var app in apps.EnumerateArray())
            {
                var packageId=app.TryGetProperty("wingetId",out var packageValue)?packageValue.GetString():null;
                if(string.IsNullOrWhiteSpace(packageId)) continue;

                var description=app.TryGetProperty("description",out var descriptionValue)
                    ? descriptionValue.GetString()??"Trusted Windows application."
                    : "Trusted Windows application.";
                var category=app.TryGetProperty("category",out var categoryValue)
                    ? categoryValue.GetString()??"Windows app"
                    : "Windows app";
                var icon=app.TryGetProperty("icon",out var iconValue)
                    ? iconValue.GetString()??""
                    : "";
                var file=Path.GetFileName(icon.Replace('/','\\'));
                result[packageId]=new(description,category,file);
            }
        }
        catch { }
        return result;
    }
}

public sealed class PackageIconConverter : IValueConverter
{
    public object? Convert(object value,Type targetType,object parameter,string language)
    {
        var meta=CatalogPresentation.Find(value?.ToString());
        if(meta is null || string.IsNullOrWhiteSpace(meta.IconFile)) return null;
        try
        {
            return new SvgImageSource
            {
                UriSource=new Uri($"ms-appx:///Assets/Apps/{Uri.EscapeDataString(meta.IconFile)}")
            };
        }
        catch { return null; }
    }

    public object ConvertBack(object value,Type targetType,object parameter,string language)
        => throw new NotSupportedException();
}

public sealed class PackageDescriptionConverter : IValueConverter
{
    public object Convert(object value,Type targetType,object parameter,string language)
        => CatalogPresentation.Find(value?.ToString())?.Description??"Trusted Windows application.";

    public object ConvertBack(object value,Type targetType,object parameter,string language)
        => throw new NotSupportedException();
}

public sealed class PackageCategoryConverter : IValueConverter
{
    public object Convert(object value,Type targetType,object parameter,string language)
        => CatalogPresentation.Find(value?.ToString())?.Category??"Windows app";

    public object ConvertBack(object value,Type targetType,object parameter,string language)
        => throw new NotSupportedException();
}