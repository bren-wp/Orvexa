namespace Orvexa.Core;

public sealed class SingleInstanceService : IDisposable
{
    readonly Mutex? mutex;
    public bool IsPrimary { get; }

    public SingleInstanceService(string name="Orvexa.Application")
    {
        try
        {
            mutex=new Mutex(true,name,out var created);
            IsPrimary=created;
        }
        catch
        {
            // A single-instance coordination failure must not prevent Orvexa from starting.
            IsPrimary=true;
        }
    }

    public void Dispose()
    {
        if(mutex is null) return;
        if(IsPrimary) try { mutex.ReleaseMutex(); } catch { }
        try { mutex.Dispose(); } catch { }
    }
}