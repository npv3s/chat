import React from 'react'
import ReactDOM from 'react-dom'

class App extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            loading: true,
            messages: []
        }

        this.ws = new WebSocket('ws://' + location.host + '/')
        this.ws.onmessage = (ws_msg) => {
            let json = JSON.parse(ws_msg.data)
            switch (json.event) {
                case 'all':
                    let author_ids = JSON.parse(localStorage.getItem('author_ids') ?? "[]")
                    json.messages.forEach(m => console.log(m._id, author_ids))
                    this.setState({
                        loading: false, messages: json.messages.map(msg => {
                            msg.time = new Date(msg.time)
                            msg.is_author = author_ids.includes(msg._id)
                            return msg
                        })
                    })
                    break
                case 'added':
                    localStorage.setItem('author_ids', JSON.stringify(
                        [...JSON.parse(localStorage.getItem('author_ids') ?? "[]"), json.message._id]
                    ))
                    this.setState((state) => {
                        return {loading: false,
                            messages: [...state.messages, {
                                _id: json.message._id,
                                time: new Date(json.message.time),
                                text: json.message.text,
                                is_author: true
                            }]
                        }
                    })
                    break
                case 'msg':
                    this.setState((state) => {
                        return {loading: false,
                            messages: [...state.messages, {
                                _id: json.message._id,
                                time: new Date(json.message.time),
                                text: json.message.text,
                                is_author: false
                            }]
                        }
                    })
                    break
            }
        }
        this.send = this.send.bind(this)
    }

    send() {
        let text = document.getElementById('msg-input').value.trim()
        if (text === "") return
        this.setState({loading: true})
        this.ws.send(JSON.stringify({'event': 'msg', 'text': text}))
    }

    componentDidUpdate() {
        let elem = document.getElementById('messages-container');
        elem.scrollTop = elem.scrollHeight;
    }

    render() {
        let messages = this.state.messages.map((msg, i) =>
            <Message key={i} is_incoming={!msg.is_author} time={msg.time} message={msg.text}/>)
        return (
            <div id="root" className="box">
                <div id="messages-container">
                    {messages}
                </div>
                <div id="send-menu" className="box">
                    <input id="msg-input" className="input" type="text"/>
                    <button className={"button" + (this.state.loading ? " is-loading" : "")}
                            onClick={this.send}>Send
                    </button>
                </div>
            </div>
        )
    }
}

function Message(props) {
    return (
        <div className={"box msg " + (props.is_incoming ? "is-align-self-flex-start" : "is-align-self-flex-end")}>
            <p>{props.message}</p>
            <small>{props.time.toTimeString().substr(0, 5)}</small>
        </div>
    )
}

ReactDOM.render(<App/>, document.getElementById("app"))