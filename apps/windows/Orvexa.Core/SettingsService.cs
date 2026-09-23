using System.Text.Json;

namespace Orvexa.Core;

public sealed record AppSettings(string Theme="system",bool ConfirmBeforeInstall=true,bool AutoRefresh=true,int SearchLimit=100);

public sealed class SettingsService
{
    const long MaxBytes=256*1024;
    readonly string path;

    public SettingsService(string? basePath=null)
    {
        path=Path.Combine(StoragePaths.Resolve(basePath),"settings.json");
    }

    public AppSettings Read()
    {
        try
        {
            if(!AtomicFile.TryReadText(path,MaxBytes,out var json)) return new();
            return Sanitize(JsonSerializer.Deserialize<AppSettings>(json)??new());
        }
        catch { return new(); }
    }

    public void Save(AppSettings value)=>
        AtomicFile.WriteText(path,JsonSerializer.Serialize(Sanitize(value)));

    static AppSettings Sanitize(AppSettings value)=>value with
    {
        SearchLimit=Math.Clamp(value.SearchLimit,25,500),
        Theme=value.Theme is "light" or "dark" or "system" ? value.Theme : "system"
    };
}