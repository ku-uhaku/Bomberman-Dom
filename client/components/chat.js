import { el, Component } from "../framework/index.js";
import { msg } from "/shared/global.js";

export class Chat extends Component {
	constructor(props) {
		super(props, { messages: [], value: "", error: "" });
		this.unsubs = [];
		this.listNode = null;
		this.stick = true; // follow new messages unless the user scrolled up
		// scroll doesn't bubble, so it can't go through the framework's event delegation
		this.onScroll = () => {
			const n = this.listNode;
			this.stick = n.scrollHeight - n.scrollTop - n.clientHeight < 24;
		};
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
		if (this.listNode) this.listNode.removeEventListener("scroll", this.onScroll);
		this.listNode = null;
	}

	scroll() {
		if (this.stick && this.listNode) this.listNode.scrollTop = this.listNode.scrollHeight;
	}

	render() {
		const { messages, value, error } = this.state;
		return el("div", { class: "chat" }, [
			el("div", {
				class: "chat-messages",
				ref: (n) => {
					if (this.listNode && this.listNode !== n) this.listNode.removeEventListener("scroll", this.onScroll);
					this.listNode = n;
					n.addEventListener("scroll", this.onScroll);
					this.scroll();
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
