using System.Text.Json;

namespace Orvexa.Core;

public sealed class ProtocolService
{
    const int MaxUriLength=8192;
    const int MaxPendingActivations=8;
    const long MaxQueueBytes=64L*1024;
    readonly string path;

    public ProtocolService(string? basePath=null)
    {
        path=Path.Combine(StoragePaths.Resolve(basePath),"activation.json");
    }

    public static string? FindCommandLineUri()
    {
        try
        {
            return Environment.GetCommandLineArgs()
                .Skip(1)
                .FirstOrDefault(x=>x.StartsWith("orvexa://",StringComparison.OrdinalIgnoreCase));
        }
        catch { return null; }
    }

    public bool TryParseInstall(string? value,out IReadOnlyList<string> ids)
    {
        ids=[];
        if(string.IsNullOrWhiteSpace(value) || value.Length>MaxUriLength) return false;
        if(!Uri.TryCreate(value,UriKind.Absolute,out var uri)) return false;
        if(!string.Equals(uri.Scheme,"orvexa",StringComparison.OrdinalIgnoreCase)) return false;
        if(!string.Equals(uri.Host,"install",StringComparison.OrdinalIgnoreCase)) return false;

        try
        {
            var raw=uri.Query.TrimStart('?')
                .Split('&',StringSplitOptions.RemoveEmptyEntries)
                .Select(x=>x.Split('=',2))
                .FirstOrDefault(x=>x.Length==2 && string.Equals(x[0],"ids",StringComparison.OrdinalIgnoreCase));

            if(raw is null) return false;
            var decoded=Uri.UnescapeDataString(raw[1]);
            var safe=decoded.Split(',',StringSplitOptions.RemoveEmptyEntries|StringSplitOptions.TrimEntries)
                .Where(PackagePolicy.IsSafeId)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(100)
                .ToArray();

            if(safe.Length==0) return false;
            ids=safe;
            return true;
        }
        catch { return false; }
    }

    public void Queue(string value)
    {
        if(string.IsNullOrWhiteSpace(value) || value.Length>MaxUriLength) return;
        WithQueueLock(()=>
        {
            var queue=ReadQueue();
            if(queue.Any(x=>string.Equals(x,value,StringComparison.OrdinalIgnoreCase))) return;
            queue.Add(value);
            WriteQueue(queue.TakeLast(MaxPendingActivations));
        });
    }

    public string? TakePending()
    {
        string? pending=null;
        WithQueueLock(()=>
        {
            var queue=ReadQueue();
            if(queue.Count==0) return;
            pending=queue[0];
            queue.RemoveAt(0);
            if(queue.Count==0)
            {
                try { if(File.Exists(path)) File.Delete(path); } catch { }
            }
            else WriteQueue(queue);
        });
        return pending;
    }

    List<string> ReadQueue()
    {
        try
        {
            if(!AtomicFile.TryReadText(path,MaxQueueBytes,out var json)) return [];
            return (JsonSerializer.Deserialize<List<string>>(json)??[])
                .Where(x=>!string.IsNullOrWhiteSpace(x) && x.Length<=MaxUriLength)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .TakeLast(MaxPendingActivations)
                .ToList();
        }
        catch { return []; }
    }

    void WriteQueue(IEnumerable<string> values)
    {
        try
        {
            var json=JsonSerializer.Serialize(values.TakeLast(MaxPendingActivations).ToArray());
            if(json.Length<=MaxQueueBytes) AtomicFile.WriteText(path,json);
        }
        catch { }
    }

    static void WithQueueLock(Action action)
    {
        Mutex? mutex=null;
        var entered=false;
        try
        {
            mutex=new Mutex(false,"Orvexa.ProtocolQueue");
            try { entered=mutex.WaitOne(TimeSpan.FromSeconds(2)); }
            catch(AbandonedMutexException) { entered=true; }
            if(entered) action();
        }
        catch { }
        finally
        {
            if(entered) try { mutex?.ReleaseMutex(); } catch { }
            try { mutex?.Dispose(); } catch { }
        }
    }
}
