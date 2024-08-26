// bare_ffi.ts

const libPath = "bare/build/Release/bare.dll";

// bare_test.ts

const libBare = Deno.dlopen(libPath, {
    log_open: { parameters: ["buffer", "i32"], result: "i32" },
    uv_setup_args: { parameters: ["i32", "pointer"], result: "pointer" },
    js_create_platform: { parameters: ["pointer", "pointer", "pointer"], result: "i32" },
    bare_setup: { parameters: ["pointer", "pointer", "pointer", "i32", "pointer", "pointer", "pointer"], result: "i32" },
    bare_load: { parameters: ["pointer", "buffer", "pointer", "pointer"], result: "i32" },
    bare_run: { parameters: ["pointer"], result: "i32" },
    bare_teardown: { parameters: ["pointer", "pointer"], result: "i32" },
    js_destroy_platform: { parameters: ["pointer"], result: "i32" },
    uv_run: { parameters: ["pointer", "i32"], result: "i32" },
    uv_loop_close: { parameters: ["pointer"], result: "i32" },
    log_close: { parameters: [], result: "i32" },
    uv_default_loop: { parameters: [], result: "pointer" },
});

function assert(condition: boolean, message?: string) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

function createPointer(buffer: ArrayBuffer): Deno.PointerValue {
    const view = new BigUint64Array(buffer);
    const value = view[0];
    return value === 0n ? null : Deno.UnsafePointer.create(value);
}

async function main() {
    let err: number;

    const logName = new TextEncoder().encode("bare\0");
    err = libBare.symbols.log_open(logName, 0);
    assert(err === 0, "Failed to open log");

    const argc = 0;
    const argvBuffer = new ArrayBuffer(8);
    const argvPtr = Deno.UnsafePointer.of(argvBuffer);
    const argv = libBare.symbols.uv_setup_args(argc, argvPtr);

    const platformBuffer = new ArrayBuffer(8);
    const platformPtr = Deno.UnsafePointer.of(platformBuffer);
    err = libBare.symbols.js_create_platform(libBare.symbols.uv_default_loop(), null, platformPtr);
    assert(err === 0, "Failed to create platform");

    const envBuffer = new ArrayBuffer(8);
    const envPtr = Deno.UnsafePointer.of(envBuffer);

    const bareBuffer = new ArrayBuffer(8);
    const barePtr = Deno.UnsafePointer.of(bareBuffer);

    const platformPointer = createPointer(platformBuffer);

    console.log("About to call bare_setup");
    err = libBare.symbols.bare_setup(
        libBare.symbols.uv_default_loop(),
        platformPointer,
        envPtr,
        argc,
        argv,
        null,
        barePtr
    );
    console.log("bare_setup returned:", err);
    assert(err === 0, "Failed to setup Bare");

    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("1 second after bare_setup");

    const barePointer = createPointer(bareBuffer);

    // Load and execute test.js
    const filename = new TextEncoder().encode("test.js\0");
    const resultBuffer = new ArrayBuffer(8);
    const resultPtr = Deno.UnsafePointer.of(resultBuffer);

    console.log("About to call bare_load");
    err = libBare.symbols.bare_load(barePointer, filename, null, resultPtr);
    console.log("bare_load returned:", err);
    assert(err === 0, "Failed to load test.js");

    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("1 second after bare_load");

    console.log("About to call bare_run");
    err = libBare.symbols.bare_run(barePointer);
    console.log("bare_run returned:", err);
    assert(err === 0, "Failed to run Bare");

    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("1 second after bare_run");

    const exitCodeBuffer = new ArrayBuffer(4);
    const exitCodePtr = Deno.UnsafePointer.of(exitCodeBuffer);
    err = libBare.symbols.bare_teardown(barePointer, exitCodePtr);
    assert(err === 0, "Failed to teardown Bare");

    err = libBare.symbols.js_destroy_platform(platformPointer);
    assert(err === 0, "Failed to destroy platform");

    err = libBare.symbols.uv_run(libBare.symbols.uv_default_loop(), 0 /* UV_RUN_DEFAULT */);
    assert(err === 0, "Failed to run uv loop");

    err = libBare.symbols.uv_loop_close(libBare.symbols.uv_default_loop());
    assert(err === 0, "Failed to close uv loop");

    err = libBare.symbols.log_close();
    assert(err === 0, "Failed to close log");

    const exitCode = new Int32Array(exitCodeBuffer)[0];
    console.log(`Bare exited with code ${exitCode}`);
    return exitCode;
}

main().catch(console.error);