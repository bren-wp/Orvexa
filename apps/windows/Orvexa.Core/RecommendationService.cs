using System.Text.Json;
namespace Orvexa.Core;
public sealed record RecommendationGroup(string Label,IReadOnlyList<string> Recommended);
public sealed class RecommendationService {
 public IReadOnlyList<string> ForDevice(DeviceProfile profile,string json){
  try{using var d=JsonDocument.Parse(json);var vendors=d.RootElement.GetProperty("vendors");var key=vendors.TryGetProperty(profile.Group,out var _) ? profile.Group : "general";return vendors.GetProperty(key).GetProperty("recommended").EnumerateArray().Select(x=>x.GetString()).Where(x=>!string.IsNullOrWhiteSpace(x)).Cast<string>().Distinct(StringComparer.OrdinalIgnoreCase).ToArray();}catch{return[];}
 }
}