{
  description = "texLooper — document templating editor (Preact + Tauri)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    fenix = {
      url = "github:nix-community/fenix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    { self, nixpkgs, fenix }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
      # The Android SDK components are unfree; scope the allowance to this shell only.
      pkgsAndroid = import nixpkgs {
        inherit system;
        config.allowUnfree = true;
        overlays = [ fenix.overlays.default ];
      };
      # Host rust (aarch64) + Android std libs in one toolchain.
      rustAndroid = with pkgsAndroid.fenix;
        combine [
          stable.cargo
          stable.rustc
          targets.aarch64-linux-android.stable.rust-std
          targets.armv7-linux-androideabi.stable.rust-std
          targets.i686-linux-android.stable.rust-std
          targets.x86_64-linux-android.stable.rust-std
        ];
      deployPkgs = with pkgs; [
        nodejs_22
        rsync
        openssh
        curl
      ];
    in
    {
      apps.${system} = {
        deploy-orangepi = {
          type = "app";
          program = "${pkgs.writeShellApplication {
            name = "deploy-orangepi";
            runtimeInputs = deployPkgs;
            text = ''
              set -euo pipefail
              cd ${self}
              exec bash deploy/orangepi/deploy-from-laptop.sh "$@"
            '';
          }}/bin/deploy-orangepi";
        };
        # Local / in-house API (ADR 0016) — builds texlooper-cli then serves.
        texlooper-serve = {
          type = "app";
          program = "${pkgs.writeShellApplication {
            name = "texlooper-serve";
            runtimeInputs = with pkgs; [ cargo rustc pkg-config openssl ];
            text = ''
              set -euo pipefail
              ROOT="${self}"
              cd "$ROOT/src-tauri"
              export TEXLOOPER_API_KEY="''${TEXLOOPER_API_KEY:-dev-change-me}"
              export TEXLOOPER_DATA_DIR="''${TEXLOOPER_DATA_DIR:-$ROOT/.data/texlooper}"
              export TEXLOOPER_CATALOG="''${TEXLOOPER_CATALOG:-sqlite}"
              mkdir -p "$TEXLOOPER_DATA_DIR"
              BIND="''${1:-127.0.0.1:8787}"
              exec cargo run --release --bin texlooper-cli -- serve --bind "$BIND"
            '';
          }}/bin/texlooper-serve";
        };
      };

      packages.${system} = {
        # Wrapper around deploy/inhouse compose docs; binary build stays cargo/Docker.
        texlooper-inhouse = pkgs.writeShellApplication {
          name = "texlooper-inhouse";
          runtimeInputs = with pkgs; [ docker-compose docker ];
          text = ''
            set -euo pipefail
            cd ${self}/deploy/inhouse
            PROFILE="''${1:-inhouse}"
            if [[ "$#" -gt 0 ]]; then shift; fi
            exec docker compose --profile "$PROFILE" up --build "$@"
          '';
        };
      };

      devShells.${system} = {
        default = pkgs.mkShell {
        name = "texlooper";
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
          echo "texLooper shell: node $(node -v), rustc $(rustc --version | cut -d' ' -f2)"
        '';
        };

        # Android cross-build shell: provides JDK + Android SDK/NDK.
        # Rust comes from the host (rustup) so targets live in ~/.rustup.
        android =
          let
          androidSdk =
            (pkgsAndroid.androidenv.composeAndroidPackages.override {
              licenseAccepted = true;
            }) {
              platformVersions = [ "34" ];
              buildToolsVersions = [ "34.0.0" ];
              ndkVersions = [ "27.0.12077973" ];
              includeNDK = true;
              includeEmulator = false;
            };
        in
        pkgsAndroid.mkShell {
          name = "texlooper-android";
          packages = with pkgsAndroid; [
            nodejs_22
            jdk17
            rustAndroid
            androidSdk.androidsdk
          ];
          shellHook = ''
            export ANDROID_HOME="${androidSdk.androidsdk}/libexec/android-sdk"
            export ANDROID_SDK_ROOT="$ANDROID_HOME"
            export NDK_HOME="$(ls -d "$ANDROID_HOME"/ndk/* 2>/dev/null | head -n1)"
            export JAVA_HOME="${pkgsAndroid.jdk17.home}"
            unset CC CXX
            # Gradle's downloaded aapt2 has no ELF interpreter on NixOS;
            # force AGP to use the SDK's patched binary instead.
            AAPT2="$ANDROID_HOME/build-tools/34.0.0/aapt2"
            GRADLE_PROPS="src-tauri/gen/android/gradle.properties"
            if [ -x "$AAPT2" ] && [ -f "$GRADLE_PROPS" ]; then
              if grep -q "^android.aapt2FromMavenOverride=" "$GRADLE_PROPS"; then
                sed -i "s|^android.aapt2FromMavenOverride=.*|android.aapt2FromMavenOverride=$AAPT2|" "$GRADLE_PROPS"
              else
                printf '\nandroid.aapt2FromMavenOverride=%s\n' "$AAPT2" >> "$GRADLE_PROPS"
              fi
            fi
            echo "texLooper android shell:"
            echo "  java   $($JAVA_HOME/bin/java -version 2>&1 | head -1)"
            echo "  sdk    $ANDROID_HOME"
            echo "  ndk    $NDK_HOME"
          '';
        };

        # Hosted demo deploy (build SPA + rsync + path-aware restart on orangepi5).
        deploy = pkgs.mkShell {
          name = "texlooper-deploy";
          packages = deployPkgs;
          shellHook = ''
            export SSH_CFG="''${SSH_CFG:-$HOME/.config/home-manager/servers/orangepi5-server/ssh-config}"
            export HOST="''${HOST:-orangepi5}"
            echo "texLooper deploy shell: node $(node -v)"
            echo "  nix run .#deploy-orangepi"
            echo "  bash deploy/orangepi/deploy-from-laptop.sh"
          '';
        };
      };
    };
}

