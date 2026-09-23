using System.Text.Json;

namespace Orvexa.Core;

public sealed record ResolvedPackage(string CatalogId,string Name,string WingetId);

public sealed class CatalogResolverService
{
    public IReadOnlyList<ResolvedPackage> Resolve(IEnumerable<string> catalogIds,string json)
    {
        var requested=catalogIds
            .Where(PackagePolicy.IsSafeId)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(100)
            .ToArray();

        if(requested.Length==0 || string.IsNullOrWhiteSpace(json)) return [];

        try
        {
            using var document=JsonDocument.Parse(json);
            var byId=new Dictionary<string,ResolvedPackage>(StringComparer.OrdinalIgnoreCase);

            foreach(var app in document.RootElement.GetProperty("apps").EnumerateArray())
            {
                var enabled=!app.TryGetProperty("enabled",out var enabledValue) || enabledValue.GetBoolean();
                var provider=app.TryGetProperty("provider",out var providerValue) ? providerValue.GetString() : null;
                var id=app.TryGetProperty("id",out var idValue) ? idValue.GetString() : null;
                var winget=app.TryGetProperty("wingetId",out var wingetValue) ? wingetValue.GetString() : null;
                var name=app.TryGetProperty("name",out var nameValue) ? nameValue.GetString() : null;

                if(!enabled || !string.Equals(provider,"winget",StringComparison.OrdinalIgnoreCase)) continue;
                if(!PackagePolicy.IsSafeId(id) || !PackagePolicy.IsSafeId(winget)) continue;
                byId[id!]=new ResolvedPackage(id!,string.IsNullOrWhiteSpace(name)?id!:name!,winget!);
            }

            return requested.Where(byId.ContainsKey).Select(x=>byId[x]).ToArray();
        }
        catch { return []; }
    }
}