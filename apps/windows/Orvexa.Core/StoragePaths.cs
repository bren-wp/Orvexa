namespace Orvexa.Core;

public static class StoragePaths
{
    public static string Resolve(string? basePath=null)
    {
        var preferred=basePath;
        if(string.IsNullOrWhiteSpace(preferred))
        {
            var local=Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            preferred=string.IsNullOrWhiteSpace(local)
                ? Path.Combine(Path.GetTempPath(),"Orvexa")
                : Path.Combine(local,"Orvexa");
        }

        if(TryCreate(preferred)) return preferred;

        var fallback=Path.Combine(Path.GetTempPath(),"Orvexa");
        TryCreate(fallback);
        return fallback;
    }

    static bool TryCreate(string path)
    {
        try
        {
            Directory.CreateDirectory(path);
            return true;
        }
        catch { return false; }
    }
}