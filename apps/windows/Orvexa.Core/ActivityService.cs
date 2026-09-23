using System.Text.Json;

namespace Orvexa.Core;

public sealed record ActivityItem(DateTimeOffset At,string PackageId,string Action,string Result,string Detail);

public sealed class ActivityService
{
    const long MaxBytes=4L*1024*1024;
    readonly string path;

    public ActivityService(string? basePath=null)
    {
        path=Path.Combine(StoragePaths.Resolve(basePath),"activity.json");
    }

    public IReadOnlyList<ActivityItem> Read()
    {
        try
        {
            if(!AtomicFile.TryReadText(path,MaxBytes,out var json)) return [];
            return (JsonSerializer.Deserialize<List<ActivityItem>>(json)??[])
                .Take(500)
                .ToArray();
        }
        catch { return []; }
    }

    public void Add(ActivityItem item)
    {
        var safe=item with
        {
            PackageId=LogSanitizer.Clean(item.PackageId,200),
            Action=LogSanitizer.Clean(item.Action,80),
            Result=LogSanitizer.Clean(item.Result,80),
            Detail=LogSanitizer.Clean(item.Detail)
        };
        var items=Read().Prepend(safe).Take(500).ToArray();
        AtomicFile.WriteText(path,JsonSerializer.Serialize(items));
    }

    public void Clear()
    {
        try { if(File.Exists(path)) File.Delete(path); } catch { }
    }
}