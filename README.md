# @bernankez/prompt

[![npm](https://img.shields.io/npm/v/@bernankez/prompt?color=red&label=npm)](https://www.npmjs.com/package/@bernankez/prompt)
[![CI](https://github.com/Bernankez/prompt/workflows/CI/badge.svg)](https://github.com/Bernankez/prompt/actions)

Forked from [@clack/prompts](https://github.com/natemoo-re/clack/tree/main/packages/prompts)

### Install

```sh
$ pnpm add @bernankez/prompt
```

### Changes in this fork
- Improve type hints.
- Add `format` option.
```ts
const options = {
  format(value: Value) {
    return formatValue(value);
  }
};
```
- Call `onCancel` callback on every prompt if `onCancel` is registered.
```ts
onCancel((value) => {
  if (isCancel(value)) {
    cancel("Operation canceled");
    process.exit(0);
  }
});
```
- Exclude `symbol` from return type. If `onCancel` is not registered, you need to handle `isCancel` in `format` for every prompt. Or else, program will exit.
```ts
const options = {
  format(value: Value) {
    if (isCancel(value)) {
      // ...
    }
    return value;
  }
};
```
- Enhanced log parameter types
```
log.message(619); // message can be a number
```