# @bernankez/prompt

[![npm](https://img.shields.io/npm/v/@bernankez/prompt?color=red&label=npm)](https://www.npmjs.com/package/@bernankez/prompt)
[![CI](https://github.com/Bernankez/prompt/workflows/CI/badge.svg)](https://github.com/Bernankez/prompt/actions)

Forked from [@clack/prompts@0.6.3](https://github.com/natemoo-re/clack/tree/main/packages/prompts)

### Install

```sh
$ pnpm add @bernankez/prompt
```

#### Changes in this fork
- Improved type hints.
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

---

# `@clack/prompts`

Effortlessly build beautiful command-line apps 🪄 [Try the demo](https://stackblitz.com/edit/clack-prompts?file=index.js)

![clack-prompt](https://github.com/natemoo-re/clack/blob/main/.github/assets/clack-demo.gif)

---

`@clack/prompts` is an opinionated, pre-styled wrapper around [`@clack/core`](https://www.npmjs.com/package/@clack/core).

- 🤏 80% smaller than other options
- 💎 Beautiful, minimal UI
- ✅ Simple API
- 🧱 Comes with `text`, `confirm`, `select`, `multiselect`, and `spinner` components

## Basics

### Setup

The `intro` and `outro` functions will print a message to begin or end a prompt session, respectively.

```js
import { intro, outro } from "@clack/prompts";

intro("create-my-app");
// Do stuff
outro("You're all set!");
```

### Cancellation

The `isCancel` function is a guard that detects when a user cancels a question with `CTRL + C`. You should handle this situation for each prompt, optionally providing a nice cancellation message with the `cancel` utility.

```js
import { cancel, isCancel, text } from "@clack/prompts";

const value = await text(/* TODO */);

if (isCancel(value)) {
  cancel("Operation cancelled.");
  process.exit(0);
}
```

## Components

### Text

The text component accepts a single line of text.

```js
import { text } from "@clack/prompts";

const meaning = await text({
  message: "What is the meaning of life?",
  placeholder: "Not sure",
  initialValue: "42",
  validate(value) {
    if (value.length === 0) { return "Value is required!"; }
  },
});
```

### Confirm

The confirm component accepts a yes or no answer. The result is a boolean value of `true` or `false`.

```js
import { confirm } from "@clack/prompts";

const shouldContinue = await confirm({
  message: "Do you want to continue?",
});
```

### Select

The select component allows a user to choose one value from a list of options. The result is the `value` prop of a given option.

```js
import { select } from "@clack/prompts";

const projectType = await select({
  message: "Pick a project type.",
  options: [
    { value: "ts", label: "TypeScript" },
    { value: "js", label: "JavaScript" },
    { value: "coffee", label: "CoffeeScript", hint: "oh no" },
  ],
});
```

### Multi-Select

The `multiselect` component allows a user to choose many values from a list of options. The result is an array with all selected `value` props.

```js
import { multiselect } from "@clack/prompts";

const additionalTools = await multiselect({
  message: "Select additional tools.",
  options: [
    { value: "eslint", label: "ESLint", hint: "recommended" },
    { value: "prettier", label: "Prettier" },
    { value: "gh-action", label: "GitHub Action" },
  ],
  required: false,
});
```

### Spinner

The spinner component surfaces a pending action, such as a long-running download or dependency installation.

```js
import { spinner } from "@clack/prompts";

const s = spinner();
s.start("Installing via npm");
// Do installation
s.stop("Installed via npm");
```

## Utilities

### Grouping

Grouping prompts together is a great way to keep your code organized. This accepts a JSON object with a name that can be used to reference the group later. The second argument is an optional but has a `onCancel` callback that will be called if the user cancels one of the prompts in the group.

```js
import * as p from "@clack/prompts";

const group = await p.group(
  {
    name: () => p.text({ message: "What is your name?" }),
    age: () => p.text({ message: "What is your age?" }),
    color: ({ results }) =>
      p.multiselect({
        message: `What is your favorite color ${results.name}?`,
        options: [
          { value: "red", label: "Red" },
          { value: "green", label: "Green" },
          { value: "blue", label: "Blue" },
        ],
      }),
  },
  {
    // On Cancel callback that wraps the group
    // So if the user cancels one of the prompts in the group this function will be called
    onCancel: ({ results }) => {
      p.cancel("Operation cancelled.");
      process.exit(0);
    },
  }
);

console.log(group.name, group.age, group.color);
```