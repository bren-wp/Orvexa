# Orvexa for Windows

Orvexa uses WinUI 3, .NET 8 and Windows App SDK.

The application has one main window and dedicated Home, Catalog, Updates, Installed, This PC, Activity, Settings and About sections. Settings and About remain inside the same application window.

Release builds are self-contained for the selected Windows architecture. The setup definition includes a license step, optional desktop shortcut, uninstall registration and production icon.

Long-running package operations are cancellable. Install, update-all and uninstall flows require in-app confirmation according to the configured policy.
