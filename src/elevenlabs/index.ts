import ListVoices from './funcs/ListVoices';
import TextToSpeech from './funcs/TextToSpeech';

const elevenlabs = {
	voices: {
		list: ListVoices
	},
	speak: TextToSpeech
};

export default elevenlabs;
