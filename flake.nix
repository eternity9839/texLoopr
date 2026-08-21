{
  description = "texLoopr — document templating editor (Preact + Tauri)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        name = "texloopr";
        packages = with pkgs; [
          nodejs_22
          cargo
          rustc
          rustfmt
          clippy
          pkg-config
          openssl
          webkitgtk_4_1
          gtk3
          libsoup_3
          libayatana-appindicator
          librsvg
          gdk-pixbuf
          pango
          cairo
          atk
        ];
        shellHook = ''
          export RUST_BACKTRACE=1
          export PKG_CONFIG_PATH="${pkgs.openssl.dev}/lib/pkgconfig''${PKG_CONFIG_PATH:+:$PKG_CONFIG_PATH}"
          echo "texLoopr shell: node $(node -v), rustc $(rustc --version | cut -d' ' -f2)"
        '';
      };
    };
}
