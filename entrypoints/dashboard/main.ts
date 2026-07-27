import { mount } from 'svelte';
import '@/src/ui/app.css';
import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });
