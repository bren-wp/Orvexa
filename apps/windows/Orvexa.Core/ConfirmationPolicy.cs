namespace Orvexa.Core;
public enum PackageAction{Install,Update,Uninstall,UpdateAll}
public sealed class ConfirmationPolicy{
 public bool RequiresConfirmation(PackageAction action,AppSettings settings)=>action switch{
  PackageAction.Install=>settings.ConfirmBeforeInstall,
  PackageAction.Update=>settings.ConfirmBeforeInstall,
  PackageAction.Uninstall=>true,
  PackageAction.UpdateAll=>true,
  _=>true
 };
}