using System.Text.Json;

namespace Orvexa.Core;

public sealed record WindowState(int Width=1320,int Height=860);

public sealed class WindowStateService
{
    const long MaxBytes=64*1024;
    readonly string path;

    public WindowStateService(string? basePath=null)
    {
        path=Path.Combine(StoragePaths.Resolve(basePath),"window-state.json");
    }

    public WindowState Read()
    {
        try
        {
            if(!AtomicFile.TryReadText(path,MaxBytes,out var json)) return new();
            return Sanitize(JsonSerializer.Deserialize<WindowState>(json)??new());
        }
        catch { return new(); }
    }

    public void Save(WindowState value)=>
        AtomicFile.WriteText(path,JsonSerializer.Serialize(Sanitize(value)));

    static WindowState Sanitize(WindowState value)=>value with
    {
        Width=Math.Clamp(value.Width,900,3840),
        Height=Math.Clamp(value.Height,620,2160)
    };
}