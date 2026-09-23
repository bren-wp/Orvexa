using System.Text.Json;

namespace Orvexa.Core;

public sealed class FavoritesService
{
    const int MaxFavorites=20000;
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
                .Take(MaxFavorites)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
        }
        catch { return new HashSet<string>(StringComparer.OrdinalIgnoreCase); }
    }

    public bool Toggle(string id)
    {
        if(!PackagePolicy.IsSafeId(id)) throw new ArgumentException("Invalid package id",nameof(id));

        var set=Read().ToHashSet(StringComparer.OrdinalIgnoreCase);
        return SetCore(set,id,!set.Contains(id));
    }

    public bool Set(string id,bool isFavorite)
    {
        if(!PackagePolicy.IsSafeId(id)) throw new ArgumentException("Invalid package id",nameof(id));

        var set=Read().ToHashSet(StringComparer.OrdinalIgnoreCase);
        return SetCore(set,id,isFavorite);
    }

    bool SetCore(HashSet<string> set,string id,bool isFavorite)
    {
        var changed=false;
        if(isFavorite)
        {
            if(!set.Contains(id) && set.Count>=MaxFavorites)
                throw new InvalidOperationException("Favorites limit reached.");
            changed=set.Add(id);
        }
        else changed=set.Remove(id);

        if(changed)
            AtomicFile.WriteText(path,JsonSerializer.Serialize(
                set.Order(StringComparer.OrdinalIgnoreCase).Take(MaxFavorites)));

        return changed;
    }
}