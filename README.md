# Project 

This is a small open-source project to create tailored and dynamic bulk document using templating and simple data formats. Its aim is to be easy to use for everyone, while allowing for advanced document customization.
It provides an editor usable on the web and as a desktop app. 


## How to install: 

You need to install Rust, Node, and npm to have all the dependencies of this project. 

#### Rust (via Chocolatey) : 

```powershell
choco install rust```


```bash
curl https://sh.rustup.rs -sSf | sh
```

#### Vite

```
npm install -D vite
```


## How to run : 

To launch the web front without the tauri app, go to src : 
```bash
vite dev
```

To launch the tauri app, go to the root of the project and run : 

```bash 
cargo tauri dev
```

# Tauri + Preact + Typescript

This template should help get you started developing with Tauri, Preact and Typescript in Vite.

[Tauri tutorial quickstart](https://v1.tauri.app/v1/guides/getting-started/setup/html-css-js)

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
