import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default [
	{
		ignores: [
			"node_modules/**",
			"**/node_modules/**",
			"**/dist/**",
			"**/coverage/**",
			"wpt/**", // Vendored Web Platform Tests — third-party, not our code
		],
	},
	js.configs.recommended,
	prettierConfig,
	{
		files: ["**/*.{js,jsx,ts,tsx}"],
		languageOptions: {
			parser: typescriptParser,
			parserOptions: {
				sourceType: "module",
			},
			globals: {
				console: "readonly",
				process: "readonly",
				Buffer: "readonly",
				globalThis: "readonly",
			},
		},
		plugins: {
			"@typescript-eslint": typescript,
			prettier,
		},
		rules: {
			"no-console": "error",
			"no-unused-vars": "off",
			"no-unused-private-class-members": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					varsIgnorePattern: "^_",
					argsIgnorePattern: "^_",
					caughtErrors: "none",
				},
			],
			"no-dupe-class-members": "off",
			"@typescript-eslint/no-dupe-class-members": "warn",
			"no-undef": "off",
			"no-redeclare": "off",
			"no-useless-catch": "error",
			"no-empty": ["error", {allowEmptyCatch: false}],
			// Style: use # for private fields, never accessibility keywords or
			// class property initializers; no dynamic import with a variable.
			"no-restricted-syntax": [
				"error",
				{
					selector: "CatchClause[param=null]",
					message: "Empty catch binding not allowed. Handle the error.",
				},
				{
					selector:
						"PropertyDefinition[accessibility='private'], PropertyDefinition[accessibility='protected'], PropertyDefinition[accessibility='public']",
					message:
						"Do not use private/protected/public keywords. Use # for private fields.",
				},
				{
					selector:
						"MethodDefinition[accessibility='private'], MethodDefinition[accessibility='protected'], MethodDefinition[accessibility='public']",
					message:
						"Do not use private/protected/public keywords. Use # for private methods.",
				},
				{
					selector: "PropertyDefinition[value]",
					message:
						"Do not use class property initializers. Initialize properties in the constructor.",
				},
				{
					selector: "ImportExpression[source.type!='Literal']",
					message:
						"Dynamic import with a variable is not allowed — bundlers cannot analyze it.",
				},
			],
			"prettier/prettier": [
				"error",
				{
					trailingComma: "all",
					arrowParens: "always",
					useTabs: true,
					bracketSpacing: false,
				},
			],
		},
	},
];
