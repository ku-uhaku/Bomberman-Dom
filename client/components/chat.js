import { el, Component } from "../framework/index.js";
import { msg, chatMax } from "/shared/global.js";

export class Chat extends Component {
	constructor(props) {
		super(props, { messages: [], error: "" });
		this.unsubs = [];
		this.listNode = null;
		this.inputNode = null;
		this.draft = "";
	}

	attach() {
		this.unsubs.push(
			this.props.ws.on(msg.chatHistory, (m) => {
				this.state.messages = m.messages;
				this.scroll();
			}),
			this.props.ws.on(msg.chatMsg, (m) => {
				this.state.messages = [...this.state.messages, m.message];
				this.scroll();
			}),
			this.props.ws.on(msg.error, (m) => {
				this.state.error = m.reason;
			})
		);
	}

	detach() {
		this.unsubs.forEach((off) => off());
		this.unsubs = [];
		this.listNode = null;
		this.inputNode = null;
		this.draft = "";
	}

	scroll() {
		// defer until after the pending renderTree so the newest message is included
		requestAnimationFrame(() => {
			if (this.listNode) this.listNode.scrollTop = this.listNode.scrollHeight;
		});
	}

	send() {
		const text = this.draft.trim();
		if (!text) return;
		this.state.error = "";
		if (this.props.ws.sendMessage({ type: msg.chat, text })) {
			this.draft = "";
			if (this.inputNode) this.inputNode.value = "";
		} else {
			this.state.error = "not connected";
		}
	}

	render() {
		const { messages, error } = this.state;
		return el("div", {
			class: "chat",
		}, [
			el("div", {
				class: "chat-messages",
				key: "messages",
				ref: (n) => {
					this.listNode = n;
					this.scroll();
				},
			}, messages.map((m, i) =>
				el("p", { key: `m${i}` }, `${m.nickname}: ${m.text}`)
			)),
			error ? el("p", { key: "err", class: "error" }, error) : null,
			el("input", {
				key: "field",
				oninput: (e) => {
					this.draft = e.target.value;
					if (this.state.error) this.state.error = "";
				},
				onkeydown: (e) => { if (e.key === "Enter") this.send(); },
				ref: (n) => { this.inputNode = n; n.value = this.draft; },
				placeholder: "say something…",
				maxlength: chatMax,
			}),
			el("button", { key: "send", onclick: () => this.send() }, "Send"),
		]);
	}
}
