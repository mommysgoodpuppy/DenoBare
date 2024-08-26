# Deno ffi to control Bare example
deps: node, deno, sync submodules

windows instructions:
```
cd bare
npm i -g bare
npx bare-dev vendor sync
npx bare-dev configure
npx bare-dev build
cd ..
deno run --allow-ffi --unstable-ffi testbare.ts
```