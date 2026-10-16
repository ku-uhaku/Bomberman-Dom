import { el, Component } from "../framework/index.js";
import { msg, chatFade, chatMax } from "/shared/global.js";

export class Chat extends Component {
	constructor(props) {
		super(props, { messages: [], value: "", error: "" });
		this.unsubs = [];
		this.listNode = null;
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
	}

	scroll() {
		if (this.listNode) this.listNode.scrollTop = this.listNode.scrollHeight;
	}

	opacity(i) {
		if (i >= chatFade) return 1;
		if (this.state.messages.length <= chatFade) return 1;
		return (i + 1) / chatFade;
	}

	render() {
		const { messages, value, error } = this.state;
		return el("div", { class: "chat" }, [
			el("div", {
				class: "chat-messages",
				ref: (n) => {
					this.listNode = n;
					this.scroll();
				},
			}, messages.map((m, i) =>
				el("p", { key: i, style: `opacity:${this.opacity(i)}` }, `${m.nickname}: ${m.text}`)
			)),
			el("form", {
				onsubmit: (e) => {
					e.preventDefault();
					// send
					const text = this.state.value.trim();
					if (!text) return;
					this.state.error = "";
					if (this.props.ws.sendMessage({ type: msg.chat, text })) this.state.value = "";
				},
			}, [
				el("input", {
					value,
					oninput: (e) => {
						this.state.error = "";
						this.state.value = e.target.value;
					},
					placeholder: "say something…",
					maxlength: chatMax,
				}),
				el("button", { type: "submit" }, "Send"),
			]),
			error ? el("p", { class: "error" }, error) : null,
		]);
	}
}
