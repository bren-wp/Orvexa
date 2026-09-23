namespace Orvexa.Core;
public sealed class CompatibilityService{
 public bool IsCompatible(IEnumerable<string>? architectures,DeviceProfile profile){
  var a=architectures?.Select(x=>x.Trim().ToLowerInvariant()).ToArray()??[];
  if(a.Length==0||a.Contains("any")||a.Contains("neutral"))return true;
  var device=profile.Architecture.ToLowerInvariant();
  return device.Contains("arm64")?a.Contains("arm64")||a.Contains("x64"):a.Contains("x64")||a.Contains("x86");
 }
}