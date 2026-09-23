using System.Text.Json;

namespace Orvexa.Core;

public sealed class CatalogSeedService
{
    public IReadOnlyList<PackageItem> FromBundledCatalog(string json)
    {
        if(string.IsNullOrWhiteSpace(json)) return [];

        try
        {
            using var document=JsonDocument.Parse(json);
            if(!document.RootElement.TryGetProperty("apps",out var apps) ||
               apps.ValueKind!=JsonValueKind.Array) return [];

            var result=new List<PackageItem>();
            foreach(var app in apps.EnumerateArray())
            {
                var enabled=!app.TryGetProperty("enabled",out var enabledValue) || enabledValue.GetBoolean();
                var provider=app.TryGetProperty("provider",out var providerValue) ? providerValue.GetString() : null;
                var wingetId=app.TryGetProperty("wingetId",out var idValue) ? idValue.GetString() : null;
                var name=app.TryGetProperty("name",out var nameValue) ? nameValue.GetString() : null;
                var version=app.TryGetProperty("versionLabel",out var versionValue) ? versionValue.GetString() : null;

                if(!enabled || !string.Equals(provider,"winget",StringComparison.OrdinalIgnoreCase)) continue;
                if(!PackagePolicy.IsSafeId(wingetId)) continue;

                result.Add(new PackageItem(
                    string.IsNullOrWhiteSpace(name)?wingetId!:name!,
                    wingetId!,
                    string.IsNullOrWhiteSpace(version)?"Latest":version!));
            }

            return result
                .GroupBy(x=>x.Id,StringComparer.OrdinalIgnoreCase)
                .Select(x=>x.First())
                .OrderBy(x=>x.Name,StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }
        catch { return []; }
    }
}