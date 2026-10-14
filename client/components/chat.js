import { el, Component } from "../framework/index.js";
import { msg } from "/shared/global.js";

export class Chat extends Component {
	constructor(props) {
		super(props, { messages: [], value: "", error: "" });
		this.unsubs = [];
		this.listNode = null;
		this.stick = true; // follow new messages unless the user scrolled up
		this.acc = 0;
		this.lastCount = 0;
	}

	attach() {
		this.unsubs.push(
			this.props.ws.on(msg.chatHistory, (m) => {
				this.state.messages = m.messages;
			}),
			this.props.ws.on(msg.chatMsg, (m) => {
				this.state.messages = [...this.state.messages, m.message];
			}),
			this.props.ws.on(msg.error, (m) => {
				this.state.error = m.reason;
			})
		);
	}

	detach() {
		this.unsubs.forEach((off) => off());
		this.unsubs = [];
	}

	tick(delta) {
		this.acc += delta;
		if (this.acc < 100) return;
		this.acc = 0;
		if (!this.listNode) return;
		const count = this.state.messages.length;
		if (count === this.lastCount) return;
		this.lastCount = count;
		if (this.stick) this.listNode.scrollTop = this.listNode.scrollHeight;
	}

	render() {
		const { messages, value, error } = this.state;
		return el("div", { class: "chat" }, [
			el("div", {
				class: "chat-messages",
				ref: (n) => {
					this.listNode = n;
					// scroll doesn't bubble, so it can't go through the framework's event delegation
					n.addEventListener("scroll", () => {
						this.stick = n.scrollHeight - n.scrollTop - n.clientHeight < 24;
					});
				},
			}, messages.map((m, i) => el("p", { key: i }, `${m.nickname}: ${m.text}`))),
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
				}),
				el("button", { type: "submit" }, "Send"),
			]),
			error ? el("p", { class: "error" }, error) : null,
		]);
	}
}
