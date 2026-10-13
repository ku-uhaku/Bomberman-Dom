import { el, Component, navigate } from "../framework/index.js";
import { msg } from "/shared/global.js";

export class NicknamePage extends Component {
	constructor(props) {
		super(props, { nickname: "", error: "", busy: false });
	}

	attach() {
		this.offJoined = this.props.ws.on(msg.joined, () => {
			this.state.busy = false;
			navigate("/lobby");
		});
		this.offError = this.props.ws.on(msg.error, (m) => {
			this.state.busy = false;
			this.state.error = m.reason;
		});
	}

	detach() {
		this.offJoined();
		this.offError();
	}

	submit(e) {
		e.preventDefault();
		if (this.state.busy) return;
		this.state.error = "";
		this.state.busy = true;
		this.props.ws
			.connect()
			.then(() => {
				const sent = this.props.ws.sendMessage({
					type: msg.join,
					nickname: this.state.nickname,
				});
				if (!sent) {
					this.state.busy = false;
					this.state.error = "not connected";
				}
			})
			.catch(() => {
				this.state.busy = false;
				this.state.error = "connection failed";
			});
	}

	render() {
		const { nickname, error, busy } = this.state;
		return el("main", {}, [
			el("h2", {}, "Nickname"),
			el("form", { onsubmit: (e) => this.submit(e) }, [
				el("input", {
					value: nickname,
					oninput: (e) => {
						this.state.error = "";
						this.state.nickname = e.target.value;
					},
					placeholder: "nickname",
					ref: (node) => node.focus(),
				}),
				el("button", { type: "submit", disabled: busy }, busy ? "Joining…" : "Join"),
			]),
			error ? el("p", { class: "error" }, error) : null,
		]);
	}
}
