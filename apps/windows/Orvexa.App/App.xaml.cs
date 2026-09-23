using Microsoft.UI.Xaml;
using Orvexa.Core;

namespace Orvexa.App;

public partial class App : Application
{
    Window? window;
    SingleInstanceService? single;
    readonly CrashLogService crashLog=new();

    public App()
    {
        InitializeComponent();
        UnhandledException+=OnUnhandledException;
        AppDomain.CurrentDomain.UnhandledException+=(_,e)=>
        {
            if(e.ExceptionObject is Exception ex) crashLog.Write(ex);
        };
        TaskScheduler.UnobservedTaskException+=(_,e)=>
        {
            crashLog.Write(e.Exception);
            e.SetObserved();
        };
    }

    void OnUnhandledException(object sender,Microsoft.UI.Xaml.UnhandledExceptionEventArgs e)
    {
        crashLog.Write(e.Exception);
        e.Handled=true;
    }

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        try
        {
            new RecoveryService().RepairLocalState();
            var protocolUri=ProtocolService.FindCommandLineUri();
            single=new SingleInstanceService();
            if(!single.IsPrimary)
            {
                if(protocolUri is not null) new ProtocolService().Queue(protocolUri);
                Exit();
                return;
            }

            window=new MainWindow(protocolUri);
            window.Closed+=(_,_)=>
            {
                single?.Dispose();
                single=null;
            };
            window.Activate();
        }
        catch(Exception ex)
        {
            crashLog.Write(ex);
            single?.Dispose();
            single=null;
            Exit();
        }
    }
}
