export type ModalityDirection = 'input' | 'output';

export function modalityLabel(modality: string, direction: ModalityDirection): string {
	const normalized = modality.toLowerCase();
	if (normalized === 'action') return direction === 'input' ? 'Robot state / action' : 'Action trajectory';
	if (normalized === 'data') return 'Structured data';
	return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

// Heroicons 20px solid paths, shared by model detail pages and the catalog table.
export function modalityIcon(modality: string): string {
	const icons: Record<string, string> = {
		text: '<path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/>',
		image: '<path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>',
		audio: '<path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clip-rule="evenodd"/>',
		video: '<path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>',
		action: '<path d="M10 2a2 2 0 012 2v1.17A3.001 3.001 0 0114 8v1h1a3 3 0 013 3v3a3 3 0 01-3 3H5a3 3 0 01-3-3v-3a3 3 0 013-3h1V8a3.001 3.001 0 012-2.83V4a2 2 0 012-2zm-4 9H5a1 1 0 00-1 1v3a1 1 0 001 1h10a1 1 0 001-1v-3a1 1 0 00-1-1H6zm1 2a1 1 0 110 2 1 1 0 010-2zm6 0a1 1 0 110 2 1 1 0 010-2z"/>',
		data: '<path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm1 3a1 1 0 100 2h2a1 1 0 100-2H5zm5 0a1 1 0 100 2h5a1 1 0 100-2h-5zM5 10a1 1 0 100 2h2a1 1 0 100-2H5zm5 0a1 1 0 100 2h5a1 1 0 100-2h-5z" clip-rule="evenodd"/>',
	};
	return icons[modality.toLowerCase()] ?? '';
}
