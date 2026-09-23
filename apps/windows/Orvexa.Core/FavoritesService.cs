using System.Text.Json;

namespace Orvexa.Core;

public sealed class FavoritesService
{
    const long MaxBytes=1024*1024;
    readonly string path;

    public FavoritesService(string? basePath=null)
    {
        path=Path.Combine(StoragePaths.Resolve(basePath),"favorites.json");
    }

    public IReadOnlySet<string> Read()
    {
        try
        {
            if(!AtomicFile.TryReadText(path,MaxBytes,out var json))
                return new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            return (JsonSerializer.Deserialize<string[]>(json)??[])
                .Where(PackagePolicy.IsSafeId)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(20000)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
        }
        catch { return new HashSet<string>(StringComparer.OrdinalIgnoreCase); }
    }

    public bool Toggle(string id)
    {
        if(!PackagePolicy.IsSafeId(id)) throw new ArgumentException("Invalid package id");

        var set=Read().ToHashSet(StringComparer.OrdinalIgnoreCase);
        var added=set.Add(id);
        if(!added) set.Remove(id);

        AtomicFile.WriteText(path,JsonSerializer.Serialize(set.Order(StringComparer.OrdinalIgnoreCase)));
        return added;
    }
}