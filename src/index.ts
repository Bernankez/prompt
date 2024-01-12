import type { State } from "@clack/core";
import {
  ConfirmPrompt,
  GroupMultiSelectPrompt,
  MultiSelectPrompt,
  PasswordPrompt,
  SelectKeyPrompt,
  SelectPrompt,
  TextPrompt,
  block,
  isCancel,
} from "@clack/core";
import isUnicodeSupported from "is-unicode-supported";
import color from "picocolors";
import { cursor, erase } from "sisteransi";

export { isCancel } from "@clack/core";

const unicode = isUnicodeSupported();
const s = (c: string, fallback: string) => (unicode ? c : fallback);
const S_STEP_ACTIVE = s("◆", "*");
const S_STEP_CANCEL = s("■", "x");
const S_STEP_ERROR = s("▲", "x");
const S_STEP_SUBMIT = s("◇", "o");

const S_BAR_START = s("┌", "T");
const S_BAR = s("│", "|");
const S_BAR_END = s("└", "—");

const S_RADIO_ACTIVE = s("●", ">");
const S_RADIO_INACTIVE = s("○", " ");
const S_CHECKBOX_ACTIVE = s("◻", "[•]");
const S_CHECKBOX_SELECTED = s("◼", "[+]");
const S_CHECKBOX_INACTIVE = s("◻", "[ ]");
const S_PASSWORD_MASK = s("▪", "•");

const S_BAR_H = s("─", "-");
const S_CORNER_TOP_RIGHT = s("╮", "+");
const S_CONNECT_LEFT = s("├", "+");
const S_CORNER_BOTTOM_RIGHT = s("╯", "+");

const S_INFO = s("●", "•");
const S_SUCCESS = s("◆", "*");
const S_WARN = s("▲", "!");
const S_ERROR = s("■", "x");

const symbol = (state: State) => {
  switch (state) {
    case "initial":
    case "active":
      return color.cyan(S_STEP_ACTIVE);
    case "cancel":
      return color.red(S_STEP_CANCEL);
    case "error":
      return color.yellow(S_STEP_ERROR);
    case "submit":
      return color.green(S_STEP_SUBMIT);
  }
};

export type CancelCallback = (value: any) => any;
let cancelCb: CancelCallback | undefined;
export function onCancel(callback: CancelCallback) {
  cancelCb = callback;
}

type Format<V, R> = (value: V) => R;
interface FormatOptions<V, R> {
  format?: Format<V, R>;
}
type ComposableResponse<O, V> = O extends FormatOptions<infer _, infer R> ? R : V;
function exclude<T>(value: T) {
  if (isCancel(value)) {
    cancel("Cancel callback not registered. Please set onCancel first.");
    process.exit(0);
  }
  return value as Exclude<T, symbol>;
}

export interface TextOptions<V extends string, R> extends FormatOptions<V, R> {
  message: string;
  placeholder?: string;
  defaultValue?: V;
  initialValue?: V;
  validate?: (value: V) => string | void;
}
export async function text<R, O extends TextOptions<string, R>>(opts: O): Promise<ComposableResponse<O, string>> {
  const value = await (new TextPrompt({
    validate: opts.validate,
    placeholder: opts.placeholder,
    defaultValue: opts.defaultValue,
    initialValue: opts.initialValue,
    render() {
      const title = `${color.gray(S_BAR)}\n${symbol(this.state)}  ${opts.message}\n`;
      const placeholder = opts.placeholder
        ? color.inverse(opts.placeholder[0]) + color.dim(opts.placeholder.slice(1))
        : color.inverse(color.hidden("_"));
      const value = !this.value ? placeholder : this.valueWithCursor;

      switch (this.state) {
        case "error":
          return `${title.trim()}\n${color.yellow(S_BAR)}  ${value}\n${color.yellow(
            S_BAR_END,
          )}  ${color.yellow(this.error)}\n`;
        case "submit":
          return `${title}${color.gray(S_BAR)}  ${color.dim(this.value || opts.placeholder)}`;
        case "cancel":
          return `${title}${color.gray(S_BAR)}  ${color.strikethrough(
            color.dim(this.value ?? ""),
          )}${this.value?.trim() ? `\n${color.gray(S_BAR)}` : ""}`;
        default:
          return `${title}${color.cyan(S_BAR)}  ${value}\n${color.cyan(S_BAR_END)}\n`;
      }
    },
  }).prompt()) as string | symbol;
  if (isCancel(value)) {
    cancelCb?.(value);
  }
  if (opts.format) {
    return opts.format(exclude(value)) as ComposableResponse<O, string>;
  }
  return exclude(value) as ComposableResponse<O, string>;
}

export interface PasswordOptions<V extends string, R> extends FormatOptions<V, R> {
  message: string;
  mask?: string;
  validate?: (value: V) => string | void;
}
export async function password<R, O extends PasswordOptions<string, R>>(opts: O): Promise<ComposableResponse<O, string>> {
  const value = await (new PasswordPrompt({
    validate: opts.validate,
    mask: opts.mask ?? S_PASSWORD_MASK,
    render() {
      const title = `${color.gray(S_BAR)}\n${symbol(this.state)}  ${opts.message}\n`;
      const value = this.valueWithCursor;
      const masked = this.masked;

      switch (this.state) {
        case "error":
          return `${title.trim()}\n${color.yellow(S_BAR)}  ${masked}\n${color.yellow(
            S_BAR_END,
          )}  ${color.yellow(this.error)}\n`;
        case "submit":
          return `${title}${color.gray(S_BAR)}  ${color.dim(masked)}`;
        case "cancel":
          return `${title}${color.gray(S_BAR)}  ${color.strikethrough(color.dim(masked ?? ""))}${
            masked ? `\n${color.gray(S_BAR)}` : ""
          }`;
        default:
          return `${title}${color.cyan(S_BAR)}  ${value}\n${color.cyan(S_BAR_END)}\n`;
      }
    },
  }).prompt()) as string | symbol;
  if (isCancel(value)) {
    cancelCb?.(value);
  }
  if (opts.format) {
    return opts.format(exclude(value)) as ComposableResponse<O, string>;
  }
  return exclude(value) as ComposableResponse<O, string>;
}

export interface ConfirmOptions<V, R> extends FormatOptions<V, R> {
  message: string;
  active?: string;
  inactive?: string;
  initialValue?: boolean;
}
export async function confirm<R, O extends ConfirmOptions<boolean, R>>(opts: O): Promise<ComposableResponse<O, boolean>> {
  const active = opts.active ?? "Yes";
  const inactive = opts.inactive ?? "No";
  const value = await (new ConfirmPrompt({
    active,
    inactive,
    initialValue: opts.initialValue ?? true,
    render() {
      const title = `${color.gray(S_BAR)}\n${symbol(this.state)}  ${opts.message}\n`;
      const value = this.value ? active : inactive;

      switch (this.state) {
        case "submit":
          return `${title}${color.gray(S_BAR)}  ${color.dim(value)}`;
        case "cancel":
          return `${title}${color.gray(S_BAR)}  ${color.strikethrough(
            color.dim(value),
          )}\n${color.gray(S_BAR)}`;
        default: {
          return `${title}${color.cyan(S_BAR)}  ${
            this.value
              ? `${color.green(S_RADIO_ACTIVE)} ${active}`
              : `${color.dim(S_RADIO_INACTIVE)} ${color.dim(active)}`
          } ${color.dim("/")} ${
            !this.value
              ? `${color.green(S_RADIO_ACTIVE)} ${inactive}`
              : `${color.dim(S_RADIO_INACTIVE)} ${color.dim(inactive)}`
          }\n${color.cyan(S_BAR_END)}\n`;
        }
      }
    },
  }).prompt()) as boolean | symbol;
  if (isCancel(value)) {
    cancelCb?.(value);
  }
  if (opts.format) {
    return opts.format(exclude(value)) as ComposableResponse<O, boolean>;
  }
  return exclude(value) as ComposableResponse<O, boolean>;
}

type Primitive = Readonly<string | boolean | number>;

type Option<Value> = Value extends Primitive
  ? { value: Value; label?: string; hint?: string }
  : { value: Value; label: string; hint?: string };

export interface SelectOptions<Value, R> extends FormatOptions<Value, R> {
  message: string;
  options: Option<Value>[];
  initialValue?: Value;
}

export async function select<Value, R>(opts: SelectOptions<Value, R> & Required<FormatOptions<Value, R>>): Promise<R>;
export async function select<Value, R>(opts: Omit<SelectOptions<Value, R>, "format">): Promise<Value>;
export async function select<Value, R>(opts: SelectOptions<Value, R>) {
  const opt = (option: Option<Value>, state: "inactive" | "active" | "selected" | "cancelled") => {
    const label = option.label ?? String(option.value);
    if (state === "active") {
      return `${color.green(S_RADIO_ACTIVE)} ${label} ${
        option.hint ? color.dim(`(${option.hint})`) : ""
      }`;
    } else if (state === "selected") {
      return `${color.dim(label)}`;
    } else if (state === "cancelled") {
      return `${color.strikethrough(color.dim(label))}`;
    }
    return `${color.dim(S_RADIO_INACTIVE)} ${color.dim(label)}`;
  };

  const value = (await new SelectPrompt({
    options: opts.options,
    initialValue: opts.initialValue,
    render() {
      const title = `${color.gray(S_BAR)}\n${symbol(this.state)}  ${opts.message}\n`;

      switch (this.state) {
        case "submit":
          return `${title}${color.gray(S_BAR)}  ${opt(this.options[this.cursor], "selected")}`;
        case "cancel":
          return `${title}${color.gray(S_BAR)}  ${opt(
            this.options[this.cursor],
            "cancelled",
          )}\n${color.gray(S_BAR)}`;
        default: {
          return `${title}${color.cyan(S_BAR)}  ${this.options
            .map((option, i) => opt(option, i === this.cursor ? "active" : "inactive"))
            .join(`\n${color.cyan(S_BAR)}  `)}\n${color.cyan(S_BAR_END)}\n`;
        }
      }
    },
  }).prompt()) as Value | symbol;
  if (isCancel(value)) {
    cancelCb?.(value);
  }
  if (opts.format) {
    return opts.format(exclude(value));
  }
  return exclude(value);
}

export async function selectKey<Value, R>(opts: SelectOptions<Value, R> & Required<FormatOptions<Value, R>>): Promise<R>;
export async function selectKey<Value, R>(opts: Omit<SelectOptions<Value, R>, "format">): Promise<Value>;
export async function selectKey<Value extends string, R>(opts: SelectOptions<Value, R>) {
  const opt = (
    option: Option<Value>,
    state: "inactive" | "active" | "selected" | "cancelled" = "inactive",
  ) => {
    const label = option.label ?? String(option.value);
    if (state === "selected") {
      return `${color.dim(label)}`;
    } else if (state === "cancelled") {
      return `${color.strikethrough(color.dim(label))}`;
    } else if (state === "active") {
      return `${color.bgCyan(color.gray(` ${option.value} `))} ${label} ${
        option.hint ? color.dim(`(${option.hint})`) : ""
      }`;
    }
    return `${color.gray(color.bgWhite(color.inverse(` ${option.value} `)))} ${label} ${
      option.hint ? color.dim(`(${option.hint})`) : ""
    }`;
  };

  const value = (await new SelectKeyPrompt({
    options: opts.options,
    initialValue: opts.initialValue,
    render() {
      const title = `${color.gray(S_BAR)}\n${symbol(this.state)}  ${opts.message}\n`;

      switch (this.state) {
        case "submit":
          return `${title}${color.gray(S_BAR)}  ${opt(
            this.options.find(opt => opt.value === this.value)!,
            "selected",
          )}`;
        case "cancel":
          return `${title}${color.gray(S_BAR)}  ${opt(this.options[0], "cancelled")}\n${color.gray(
            S_BAR,
          )}`;
        default: {
          return `${title}${color.cyan(S_BAR)}  ${this.options
            .map((option, i) => opt(option, i === this.cursor ? "active" : "inactive"))
            .join(`\n${color.cyan(S_BAR)}  `)}\n${color.cyan(S_BAR_END)}\n`;
        }
      }
    },
  }).prompt()) as Value | symbol;
  if (isCancel(value)) {
    cancelCb?.(value);
  }
  if (opts.format) {
    return opts.format(exclude(value));
  }
  return exclude(value);
}

export interface MultiSelectOptions<Value, R> extends FormatOptions<Value[], R> {
  message: string;
  options: Option<Value>[];
  initialValues?: Value[];
  required?: boolean;
  cursorAt?: Value;
}
export async function multiselect<Value, R>(opts: MultiSelectOptions<Value, R> & Required<FormatOptions<Value[], R>>): Promise<R>;
export async function multiselect<Value, R>(opts: Omit<MultiSelectOptions<Value, R>, "format">): Promise<Value[]>;
export async function multiselect<Value, R>(opts: MultiSelectOptions<Value, R>) {
  const opt = (
    option: Option<Value>,
    state: "inactive" | "active" | "selected" | "active-selected" | "submitted" | "cancelled",
  ) => {
    const label = option.label ?? String(option.value);
    if (state === "active") {
      return `${color.cyan(S_CHECKBOX_ACTIVE)} ${label} ${
        option.hint ? color.dim(`(${option.hint})`) : ""
      }`;
    } else if (state === "selected") {
      return `${color.green(S_CHECKBOX_SELECTED)} ${color.dim(label)}`;
    } else if (state === "cancelled") {
      return `${color.strikethrough(color.dim(label))}`;
    } else if (state === "active-selected") {
      return `${color.green(S_CHECKBOX_SELECTED)} ${label} ${
        option.hint ? color.dim(`(${option.hint})`) : ""
      }`;
    } else if (state === "submitted") {
      return `${color.dim(label)}`;
    }
    return `${color.dim(S_CHECKBOX_INACTIVE)} ${color.dim(label)}`;
  };

  const value = (await new MultiSelectPrompt({
    options: opts.options,
    initialValues: opts.initialValues,
    required: opts.required ?? true,
    cursorAt: opts.cursorAt,
    validate(selected: Value[]) {
      if (this.required && selected.length === 0) {
        return `Please select at least one option.\n${color.reset(
          color.dim(
            `Press ${color.gray(color.bgWhite(color.inverse(" space ")))} to select, ${color.gray(
              color.bgWhite(color.inverse(" enter ")),
            )} to submit`,
          ),
        )}`;
      }
    },
    render() {
      const title = `${color.gray(S_BAR)}\n${symbol(this.state)}  ${opts.message}\n`;

      switch (this.state) {
        case "submit": {
          return `${title}${color.gray(S_BAR)}  ${
            this.options
              .filter(({ value }) => this.value.includes(value))
              .map(option => opt(option, "submitted"))
              .join(color.dim(", ")) || color.dim("none")
          }`;
        }
        case "cancel": {
          const label = this.options
            .filter(({ value }) => this.value.includes(value))
            .map(option => opt(option, "cancelled"))
            .join(color.dim(", "));
          return `${title}${color.gray(S_BAR)}  ${
            label.trim() ? `${label}\n${color.gray(S_BAR)}` : ""
          }`;
        }
        case "error": {
          const footer = this.error
            .split("\n")
            .map((ln, i) =>
              i === 0 ? `${color.yellow(S_BAR_END)}  ${color.yellow(ln)}` : `   ${ln}`,
            )
            .join("\n");
          return (
            `${title
            + color.yellow(S_BAR)
            }  ${
            this.options
              .map((option, i) => {
                const selected = this.value.includes(option.value);
                const active = i === this.cursor;
                if (active && selected) {
                  return opt(option, "active-selected");
                }
                if (selected) {
                  return opt(option, "selected");
                }
                return opt(option, active ? "active" : "inactive");
              })
              .join(`\n${color.yellow(S_BAR)}  `)
            }\n${
            footer
            }\n`
          );
        }
        default: {
          return `${title}${color.cyan(S_BAR)}  ${this.options
            .map((option, i) => {
              const selected = this.value.includes(option.value);
              const active = i === this.cursor;
              if (active && selected) {
                return opt(option, "active-selected");
              }
              if (selected) {
                return opt(option, "selected");
              }
              return opt(option, active ? "active" : "inactive");
            })
            .join(`\n${color.cyan(S_BAR)}  `)}\n${color.cyan(S_BAR_END)}\n`;
        }
      }
    },
  }).prompt()) as Value[] | symbol;
  if (isCancel(value)) {
    cancelCb?.(value);
  }
  if (opts.format) {
    return opts.format(exclude(value));
  }
  return exclude(value);
}

export interface GroupMultiSelectOptions<Value, R> extends FormatOptions<Value[], R> {
  message: string;
  options: Record<string, Option<Value>[]>;
  initialValues?: Value[];
  required?: boolean;
  cursorAt?: Value;
}
export async function groupMultiselect<Value, R>(opts: GroupMultiSelectOptions<Value, R> & Required<FormatOptions<Value[], R>>): Promise<R>;
export async function groupMultiselect<Value, R>(opts: Omit<GroupMultiSelectOptions<Value, R>, "format">): Promise<Value[]>;
export async function groupMultiselect<Value, R>(opts: GroupMultiSelectOptions<Value, R>) {
  const opt = (
    option: Option<Value>,
    state:
    | "inactive"
    | "active"
    | "selected"
    | "active-selected"
    | "group-active"
    | "group-active-selected"
    | "submitted"
    | "cancelled",
    options: Option<Value>[] = [],
  ) => {
    const label = option.label ?? String(option.value);
    const isItem = typeof (option as any).group === "string";
    const next = isItem && (options[options.indexOf(option) + 1] ?? { group: true });
    const isLast = isItem && (next as any).group === true;
    const prefix = isItem ? `${isLast ? S_BAR_END : S_BAR} ` : "";

    if (state === "active") {
      return `${color.dim(prefix)}${color.cyan(S_CHECKBOX_ACTIVE)} ${label} ${
        option.hint ? color.dim(`(${option.hint})`) : ""
      }`;
    } else if (state === "group-active") {
      return `${prefix}${color.cyan(S_CHECKBOX_ACTIVE)} ${color.dim(label)}`;
    } else if (state === "group-active-selected") {
      return `${prefix}${color.green(S_CHECKBOX_SELECTED)} ${color.dim(label)}`;
    } else if (state === "selected") {
      return `${color.dim(prefix)}${color.green(S_CHECKBOX_SELECTED)} ${color.dim(label)}`;
    } else if (state === "cancelled") {
      return `${color.strikethrough(color.dim(label))}`;
    } else if (state === "active-selected") {
      return `${color.dim(prefix)}${color.green(S_CHECKBOX_SELECTED)} ${label} ${
        option.hint ? color.dim(`(${option.hint})`) : ""
      }`;
    } else if (state === "submitted") {
      return `${color.dim(label)}`;
    }
    return `${color.dim(prefix)}${color.dim(S_CHECKBOX_INACTIVE)} ${color.dim(label)}`;
  };

  const value = (await new GroupMultiSelectPrompt({
    options: opts.options,
    initialValues: opts.initialValues,
    required: opts.required ?? true,
    cursorAt: opts.cursorAt,
    validate(selected: Value[]) {
      if (this.required && selected.length === 0) {
        return `Please select at least one option.\n${color.reset(
          color.dim(
            `Press ${color.gray(color.bgWhite(color.inverse(" space ")))} to select, ${color.gray(
              color.bgWhite(color.inverse(" enter ")),
            )} to submit`,
          ),
        )}`;
      }
    },
    render() {
      const title = `${color.gray(S_BAR)}\n${symbol(this.state)}  ${opts.message}\n`;

      switch (this.state) {
        case "submit": {
          return `${title}${color.gray(S_BAR)}  ${this.options
            .filter(({ value }) => this.value.includes(value))
            .map(option => opt(option, "submitted"))
            .join(color.dim(", "))}`;
        }
        case "cancel": {
          const label = this.options
            .filter(({ value }) => this.value.includes(value))
            .map(option => opt(option, "cancelled"))
            .join(color.dim(", "));
          return `${title}${color.gray(S_BAR)}  ${
            label.trim() ? `${label}\n${color.gray(S_BAR)}` : ""
          }`;
        }
        case "error": {
          const footer = this.error
            .split("\n")
            .map((ln, i) =>
              i === 0 ? `${color.yellow(S_BAR_END)}  ${color.yellow(ln)}` : `   ${ln}`,
            )
            .join("\n");
          return `${title}${color.yellow(S_BAR)}  ${this.options
            .map((option, i, options) => {
              const selected
                = this.value.includes(option.value)
                || (option.group === true && this.isGroupSelected(`${option.value}`));
              const active = i === this.cursor;
              const groupActive
                = !active
                && typeof option.group === "string"
                && this.options[this.cursor].value === option.group;
              if (groupActive) {
                return opt(option, selected ? "group-active-selected" : "group-active", options);
              }
              if (active && selected) {
                return opt(option, "active-selected", options);
              }
              if (selected) {
                return opt(option, "selected", options);
              }
              return opt(option, active ? "active" : "inactive", options);
            })
            .join(`\n${color.yellow(S_BAR)}  `)}\n${footer}\n`;
        }
        default: {
          return `${title}${color.cyan(S_BAR)}  ${this.options
            .map((option, i, options) => {
              const selected
                = this.value.includes(option.value)
                || (option.group === true && this.isGroupSelected(`${option.value}`));
              const active = i === this.cursor;
              const groupActive
                = !active
                && typeof option.group === "string"
                && this.options[this.cursor].value === option.group;
              if (groupActive) {
                return opt(option, selected ? "group-active-selected" : "group-active", options);
              }
              if (active && selected) {
                return opt(option, "active-selected", options);
              }
              if (selected) {
                return opt(option, "selected", options);
              }
              return opt(option, active ? "active" : "inactive", options);
            })
            .join(`\n${color.cyan(S_BAR)}  `)}\n${color.cyan(S_BAR_END)}\n`;
        }
      }
    },
  }).prompt()) as Value[] | symbol;
  if (isCancel(value)) {
    cancelCb?.(value);
  }
  if (opts.format) {
    return opts.format(exclude(value));
  }
  return exclude(value);
}

const strip = (str: string) => str.replace(ansiRegex(), "");
export const note = (message = "", title = "") => {
  const lines = `\n${message}\n`.split("\n");
  const len
    = Math.max(
      lines.reduce((sum, ln) => {
        ln = strip(ln);
        return ln.length > sum ? ln.length : sum;
      }, 0),
      strip(title).length,
    ) + 2;
  const msg = lines
    .map(
      ln =>
        `${color.gray(S_BAR)}  ${color.dim(ln)}${" ".repeat(len - strip(ln).length)}${color.gray(
          S_BAR,
        )}`,
    )
    .join("\n");
  process.stdout.write(
    `${color.gray(S_BAR)}\n${color.green(S_STEP_SUBMIT)}  ${color.reset(title)} ${color.gray(
      S_BAR_H.repeat(Math.max(len - title.length - 1, 1)) + S_CORNER_TOP_RIGHT,
    )}\n${msg}\n${color.gray(S_CONNECT_LEFT + S_BAR_H.repeat(len + 2) + S_CORNER_BOTTOM_RIGHT)}\n`,
  );
};

export const cancel = (message = "") => {
  process.stdout.write(`${color.gray(S_BAR_END)}  ${color.red(message)}\n\n`);
};

export const intro = (title = "") => {
  process.stdout.write(`${color.gray(S_BAR_START)}  ${title}\n`);
};

export const outro = (message = "") => {
  process.stdout.write(`${color.gray(S_BAR)}\n${color.gray(S_BAR_END)}  ${message}\n\n`);
};

export interface LogMessageOptions {
  symbol?: string;
}
export const log = {
  message: (message: string | number = "", { symbol = color.gray(S_BAR) }: LogMessageOptions = {}) => {
    const parts = [`${color.gray(S_BAR)}`];
    if (message) {
      const [firstLine, ...lines] = message.toString().split("\n");
      parts.push(`${symbol}  ${firstLine}`, ...lines.map(ln => `${color.gray(S_BAR)}  ${ln}`));
    }
    process.stdout.write(`${parts.join("\n")}\n`);
  },
  info: (message: string | number) => {
    log.message(message, { symbol: color.blue(S_INFO) });
  },
  success: (message: string | number) => {
    log.message(message, { symbol: color.green(S_SUCCESS) });
  },
  step: (message: string | number) => {
    log.message(message, { symbol: color.green(S_STEP_SUBMIT) });
  },
  warn: (message: string | number) => {
    log.message(message, { symbol: color.yellow(S_WARN) });
  },
  /** alias for `log.warn()`. */
  warning: (message: string | number) => {
    log.warn(message);
  },
  error: (message: string | number) => {
    log.message(message, { symbol: color.red(S_ERROR) });
  },
};

const frames = unicode ? ["◒", "◐", "◓", "◑"] : ["•", "o", "O", "0"];

export const spinner = () => {
  let unblock: () => void;
  let loop: NodeJS.Timer;
  const delay = unicode ? 80 : 120;
  return {
    start(message = "") {
      message = message.replace(/\.?\.?\.$/, "");
      unblock = block();
      process.stdout.write(`${color.gray(S_BAR)}\n${color.magenta("○")}  ${message}\n`);
      let i = 0;
      let dot = 0;
      loop = setInterval(() => {
        const frame = frames[i];
        process.stdout.write(cursor.move(-999, -1));
        process.stdout.write(
          `${color.magenta(frame)}  ${message}${
            Math.floor(dot) >= 1 ? ".".repeat(Math.floor(dot)).slice(0, 3) : ""
          }   \n`,
        );
        i = i === frames.length - 1 ? 0 : i + 1;
        dot = dot === frames.length ? 0 : dot + 0.125;
      }, delay);
    },
    stop(message = "") {
      process.stdout.write(cursor.move(-999, -2));
      process.stdout.write(erase.down(2));
      clearInterval(loop);
      process.stdout.write(`${color.gray(S_BAR)}\n${color.green(S_STEP_SUBMIT)}  ${message}\n`);
      unblock();
    },
  };
};

// Adapted from https://github.com/chalk/ansi-regex
// @see LICENSE
function ansiRegex() {
  const pattern = [
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))",
  ].join("|");

  return new RegExp(pattern, "g");
}

export type PromptGroupAwaitedReturn<T> = {
  [P in keyof T]: Exclude<Awaited<T[P]>, symbol>;
};

export interface PromptGroupOptions<T> {
  /**
   * Control how the group can be canceled
   * if one of the prompts is canceled.
   */
  onCancel?: (opts: { results: Prettify<Partial<PromptGroupAwaitedReturn<T>>> }) => void;
}

type Prettify<T> = {
  [P in keyof T]: T[P];
} & {};

export type PromptGroup<T> = {
  [P in keyof T]: (opts: {
    results: Prettify<Partial<PromptGroupAwaitedReturn<Omit<T, P>>>>;
  }) => void | Promise<T[P] | void>;
};

/**
 * Define a group of prompts to be displayed
 * and return a results of objects within the group
 */
export const group = async <T>(
  prompts: PromptGroup<T>,
  opts?: PromptGroupOptions<T>,
): Promise<Prettify<PromptGroupAwaitedReturn<T>>> => {
  const results = {} as any;
  const promptNames = Object.keys(prompts);

  for (const name of promptNames) {
    const prompt = prompts[name as keyof T];
    const result = await prompt({ results })?.catch((e) => {
      throw e;
    });

    // Pass the results to the onCancel function
    // so the user can decide what to do with the results
    // TODO: Switch to callback within core to avoid isCancel Fn
    if (typeof opts?.onCancel === "function" && isCancel(result)) {
      results[name] = "canceled";
      opts.onCancel({ results });
      continue;
    }

    results[name] = result;
  }

  return results;
};
