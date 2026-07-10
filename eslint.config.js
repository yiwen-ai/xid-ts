import eslintConfigPrettier from "eslint-config-prettier"

export default [
  { ignores: ["dist/", "coverage/", "debug/"] },
  eslintConfigPrettier,
]
