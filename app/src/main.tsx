import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import './styles.css';

render(<App />, document.getElementById('app')!);

// Aggiorna il service worker in silenzio: la nuova versione vale dalla prossima apertura.
registerSW({ immediate: true });
