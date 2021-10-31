# Workaholic

Workaholic is a toolkit for parsing your files into Worker KV entries with a pipeline-like plugin system. It is...

- **Extensible** - Customises the build and query with plugins
- **Batteries-included** - Works out of the box with built-in plugins
- **No-code solution** - Ships your data as an API without the need to write a worker

## How is it different from serving assets files directly?

There are 2 main reasons you might want to use Workaholic:

1. Preprocessing: Instead of re-processing the files every time on the server or client, the plugin system allows you to preprocess it once and save the result directly in Worker KV.
2. Indexing: The KV `List` API is rather limited on how you can query entries and also costly compared to the `Get` call. Workaholic enables a simpler setup on building your own index which you can retrieve with a single `Get`.

## How it works

Check the [demo](https://demo.workaholic.site) for details.

## Is it production-ready?

No. This project starts with a simple script and eventually turns into an over-engineered solution with wider scope. It is experimental and probably buggy at the moment, but I wish this demo can give you an idea of what it is capable of for now.

## Known issues

- The tool does not take the max entry size (25MB) into account at the moment.
- For plugins with custom `setupQuery` logic, it might fail if it imports any node packages, eg. `fs` / `path`.
