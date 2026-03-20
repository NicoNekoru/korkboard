export type ClassValue =
	| string
	| false
	| null
	| undefined
	| ClassValue[]
	| Record<string, boolean | null | undefined>;

function flattenClasses(value: ClassValue, output: string[]) {
	if (!value) {
		return;
	}

	if (typeof value === 'string') {
		output.push(value);
		return;
	}

	if (Array.isArray(value)) {
		value.forEach((entry) => flattenClasses(entry, output));
		return;
	}

	Object.entries(value).forEach(([key, enabled]) => {
		if (enabled) {
			output.push(key);
		}
	});
}

export function cn(...inputs: ClassValue[]) {
	const output: string[] = [];
	inputs.forEach((input) => flattenClasses(input, output));
	return output.join(' ');
}
