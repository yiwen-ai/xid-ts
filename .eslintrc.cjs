/* eslint-env node */
module.exports = {
    env: {
        browser: true,
        es2021: true
    },
    extends: [
        "plugin:@typescript-eslint/recommended-type-checked",
        "plugin:@typescript-eslint/stylistic-type-checked"
    ],
    plugins: ["@typescript-eslint"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: ["./tsconfig.eslint.json"],
        ecmaVersion: "latest",
        sourceType: "module"
    },
    root: true,
}
