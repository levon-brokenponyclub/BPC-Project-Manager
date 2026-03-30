# Strict CLI Prompt Answer Sheet

## Decision Summary

You asked for:

- isolated V2 build
- no impact on current version
- full dark and light theme support
- dark-first design direction

Because of that, these are the strict answers.

Default recommendation:

- no separate second light init pass
- no `--rtl` by default

## Before Running Anything

| Prompt / Decision                                    | Yes / No | Answer |
| ---------------------------------------------------- | -------- | ------ |
| Create a separate V2 folder first?                   | Yes      | Yes    |
| Run shadcn init in the current app root?             | No       | No     |
| Keep current version untouched while V2 is built?    | Yes      | Yes    |
| Use one V2 app instead of modifying the current app? | Yes      | Yes    |

## Template Choice

| Prompt / Decision                        | Yes / No | Answer |
| ---------------------------------------- | -------- | ------ |
| Use Next.js for the isolated V2 app?     | No       | No     |
| Use React Router for this V2 scaffold?   | Yes      | Yes    |
| Use Vite for this V2 scaffold?           | No       | No     |
| Use Laravel for this V2 scaffold?        | No       | No     |
| Use Astro for this V2 scaffold?          | No       | No     |
| Use TanStack Start for this V2 scaffold? | No       | No     |

## Base Choice

| Prompt / Decision | Yes / No | Answer |
| ----------------- | -------- | ------ |
| Use Base UI?      | No       | No     |
| Use Radix UI?     | Yes      | Yes    |

## Project Options

| Prompt / Decision   | Yes / No      | Answer                                           |
| ------------------- | ------------- | ------------------------------------------------ |
| Create a monorepo?  | No            | No                                               |
| Enable RTL support? | No by default | No unless RTL is a confirmed product requirement |

## Package Manager

| Prompt / Decision | Yes / No | Answer |
| ----------------- | -------- | ------ |
| Use npm?          | Yes      | Yes    |
| Use pnpm?         | No       | No     |
| Use yarn?         | No       | No     |
| Use bun?          | No       | No     |

## Theme Strategy

| Prompt / Decision                                                  | Yes / No | Answer |
| ------------------------------------------------------------------ | -------- | ------ |
| Build both dark and light themes in the same V2 app?               | Yes      | Yes    |
| Run separate dark init and light init commands in the same folder? | No       | No     |
| Run a separate second light init pass?                             | No       | No     |
| Create separate dark-only and light-only apps?                     | No       | No     |
| Start from a dark-first preset direction?                          | Yes      | Yes    |
| Require full light-mode coverage from the start?                   | Yes      | Yes    |

## Command Choice

### Use this

```bash
cd v2
npx shadcn@latest init --preset b3JRFvm6fI --template react-router
```

### Use this only if RTL is confirmed

```bash
cd v2
npx shadcn@latest init --preset b3JRFvm6fI --template react-router --rtl
```

### Do not use this

```bash
nnpx shadcn@latest init --preset b3JRFvm6fI --template react-router --rtl
```

Reasons:

- `nnpx` is a typo
- do not enable `--rtl` unless RTL languages are in scope now

### Do not use this as a second pass in the same app

```bash
npx shadcn@latest init --preset b3JRFvm6fI
```

Reason:

- dark and light are not separate init passes
- they are theme tokens in one app
- the default recommendation excludes a second light init pass entirely

## One-Line Runbook

1. `cd v2`
2. run the recommended init command
3. keep all generated files inside `v2/`
4. implement both light and dark themes in that one app
5. do not touch current app during V2 scaffold stage
