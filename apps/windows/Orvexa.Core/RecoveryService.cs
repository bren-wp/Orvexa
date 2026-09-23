using System.Text.Json;

namespace Orvexa.Core;

public sealed class RecoveryService
{
    const long DefaultMaxBytes=4L*1024*1024;
    readonly string dir;

    static readonly IReadOnlyDictionary<string,long> StateLimits=new Dictionary<string,long>(StringComparer.OrdinalIgnoreCase)
    {
        ["settings.json"]=256L*1024,
        ["favorites.json"]=512L*1024,
        ["activity.json"]=4L*1024*1024,
        ["catalog-cache.json"]=16L*1024*1024,
        ["window-state.json"]=64L*1024,
        ["activation.json"]=64L*1024
    };

    public RecoveryService(string? basePath = null)
    {
        dir=StoragePaths.Resolve(basePath);
    }

    public void RepairLocalState()
    {
        try
        {
            foreach(var item in StateLimits)
            {
                var path=Path.Combine(dir,item.Key);
                if(!File.Exists(path)) continue;

                if(!AtomicFile.TryReadText(path,item.Value>0?item.Value:DefaultMaxBytes,out var json) || !IsValidJson(json))
                    Quarantine(path,item.Key);
            }

            // Remove the legacy single-value handoff file after upgrading to the bounded queue format.
            var legacy=Path.Combine(dir,"activation.txt");
            if(File.Exists(legacy))
            {
                try { File.Delete(legacy); } catch { }
            }
        }
        catch { }
    }

    static bool IsValidJson(string json)
    {
        try
        {
            using var _=JsonDocument.Parse(json);
            return true;
        }
        catch { return false; }
    }

    void Quarantine(string path,string name)
    {
        try
        {
            var target=path+".corrupt-"+DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            File.Move(path,target,true);
            Prune(name,keep:3);
        }
        catch { }
    }

    void Prune(string name,int keep)
    {
        try
        {
            foreach(var old in Directory.GetFiles(dir,name+".corrupt-*")
                         .OrderByDescending(File.GetLastWriteTimeUtc)
                         .Skip(keep))
            {
                try { File.Delete(old); } catch { }
            }
        }
        catch { }
    }
}
