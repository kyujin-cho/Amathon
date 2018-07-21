import React from 'react'
import ReactDOM from 'react-dom'
import Modal from 'react-modal'
import axios from 'axios'
import TextField from '@material-ui/core/TextField'
import Input from '@material-ui/core/Input'
import InputAdornment from '@material-ui/core/InputAdornment'
import FormControl from '@material-ui/core/FormControl'
import FormHelperText from '@material-ui/core/FormHelperText'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Checkbox from '@material-ui/core/Checkbox'
import classNames from 'classnames'
import PropTypes from 'prop-types'
import { withStyles } from '@material-ui/core/styles'
import LinearProgress from '@material-ui/core/LinearProgress'

const loginModalStyles = {
  content : {
    top                   : '30%',
    left                  : '50%',
    right                 : 'auto',
    bottom                : 'auto',
    marginRight           : '-50%',
    transform             : 'translate(-50%, -50%)',
    width: '45%',
  }
}

const voiceModalStyles = {
  content : {
    top                   : '30%',
    left                  : '50%',
    right                 : 'auto',
    bottom                : 'auto',
    marginRight           : '-50%',
    transform             : 'translate(-50%, -50%)',
    backgroundImage       : 'url(/images/listening.png)',
    width: '300px',
    height: '300px',
    backgroundSize: 'contain',
    backgroundPosition: 'bottom',
    backgroundRepeat: 'no-repeat'
  }
}

const AmountModalStyles = {
  content : {
    top                   : '30%',
    left                  : '50%',
    right                 : 'auto',
    bottom                : 'auto',
    marginRight           : '-50%',
    transform             : 'translate(-50%, -50%)',
    width: '45%',
    height: '250px'
  }
}

const styles = theme => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  margin: {
    margin: theme.spacing.unit,
  },
  withoutLabel: {
    marginTop: theme.spacing.unit * 3,
  },
  textField: {
    flexBasis: 200,
  },
})


class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      chunk: null,
      items: [],
      itemsInKorean: {},
      selectedItem: '',
      cart: [],
      amount: -1,
      isStopped: false,
      mediaRecorder: null,
      userData: {},
      isVoiceModalOpen: false,
      isLoginModalOpen: false,
      isCartModalOpen: false,
      isAmountModalOpen: false,
      loggedIn: false,
      recordingCanceled: false,
      displayProgress: false,
      checked: false,
      username: '',
      password: '',
      loginBtnColor: '576843',
      loginModalBtnText: '로그인',
      recordMessage: '찾으시는 상품을 말해주세요.',
      checkStatusTimer: null
    }
  }

  async componentDidMount() {
    const res = await axios.get('/api/items')
    const resKorean = await axios.get('/api/itemsInKorean')
    this.setState({ 
      items: res.data.items,
      itemsInKorean: resKorean.data.items
    })
    await this.getUserData()
    await this.refreshCart()
  }

  async getUserData() {
    const user = await axios.get('/api/auth/user')
    this.setState({
      loggedIn: user.data.success,
      userData: user.data.success ? user.data.user : {},
      loginModalBtnText: user.data.success ? '로그아웃' : '로그인'
    })
  }

  async tryLogin() {
    try {
      const res = await axios.post('/api/auth/login', {
        username: this.state.username,
        password: this.state.password
      })
      console.log(res.data)
      await this.getUserData()
      this.setState({
        isLoginModalOpen: false
      })
      await this.refreshCart()
    } catch(e) {
      if(e.response.status == 401) {
        this.setState({
          loginBtnColor: 'ff0000'
        })
        setTimeout((() => {
          this.setState({
            loginBtnColor: '576843'
          })
        }).bind(this), 1000)
      }
    }
  }

  handleTextChange(e) {
    this.setState({
      [e.target.name]: e.target.value
    })
  }

  cancelRecording(e) {
    this.setState({
      recordingCanceled: true,
      isVoiceModalOpen: false
    })
    this.state.mediaRecorder.stop()
    if(this.state.checkStatusTimer != null) clearInterval(this.state.checkStatusTimer)
  }

  async openLoginModal() {
    if(this.state.loggedIn) {
      await axios.get('/api/auth/logout')
      await this.getUserData()
    } else {
      this.setState({isLoginModalOpen: true})
    }
  }

  async refreshCart() {
    const res = await axios.get('/api/cart')
    this.setState({
      cart: res.data.cart
    })
  }

  async recordVoice() {
    if(!navigator.mediaDevices) {
      alert('getUserMedia() is not supported in your browser')
      return false
    }
    const constraints = {audio: true}
    let chunk
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    const mediaRecorder = new MediaRecorder(stream)
    mediaRecorder.ondataavailable = (e) => {
      console.log('Chunk added')
      chunk = e.data
      console.log(e.data)
    }
    mediaRecorder.onstop = (async (e) => {
      console.log('Stopped!')
      if(!this.state.recordingCanceled) {
        this.setState({
          chunk: chunk
        })
        console.log(this.state)
        await this.sendVoice()  
      }
    }).bind(this)
    mediaRecorder.start()
    console.log(mediaRecorder.state)
    this.setState({
      mediaRecorder: mediaRecorder,
      isVoiceModalOpen: true
    })
    setTimeout(() => {if(!this.state.isStopped) mediaRecorder.stop()}, 3000)
  }

  async sendVoice() {
    if(!this.state.chunk) {
      return false
    }
    const blob = this.state.chunk
    blob.lastModifiedDate = Date.now()
    blob.name = 'tmp.ogg'
    const formData = new FormData()
    formData.append('file', blob)
    const config = {
      headers: {
        'content-type': 'multipart/form-data'
      }
    }
    const transcribeRes = await axios.post('http://ec2-52-79-251-182.ap-northeast-2.compute.amazonaws.com:5000/', formData, config)
    let transcribeUrl = ''
    let transcribeCompleted = false
    const interval = setInterval((async () => {
      const res = await axios.post('https://895sbkrkdf.execute-api.ap-northeast-2.amazonaws.com/prod/transcribe', transcribeRes.data.TranscriptionJobName, {'Content-Type': ''})
      console.log(res.data)
      if(res.data.TranscriptionJob.TranscriptionJobStatus != 'IN_PROGRESS') {
        transcribeUrl = res.data.TranscriptionJob.Transcript.TranscriptFileUri
        transcribeCompleted = res.data.TranscriptionJob.TranscriptionJobStatus == 'COMPLETED'
        clearInterval(interval)
        await this.getTranscribeData(transcribeCompleted, transcribeUrl)
      }
    }).bind(this), 5000)
    this.setState({
      recordMessage: '분석 중입니다.', 
      checkStatusTimer: interval,
      displayProgress: true
    })

  }

  async getTranscribeData(completed, url) {
    if(completed) {
      const res = await axios.get(url)
      const text = res.data.results.transcripts[0].transcript.toLowerCase()
      const selectedItems = this.state.items.filter(item => text.indexOf(item) > -1)
      if(selectedItems.length != 1) {
        this.setState({
          recordMessage: '음성 정보를 찾을 수 없습니다. 다시 시도해 주세요.'
        })
      } else {
        this.setState({
          selectedItem: selectedItems[0],
          isVoiceModalOpen: false,
          isAmountModalOpen: true
        })
        
      }

      document.getElementById('progress').style.display = 'none'
      return true  
    } else {
      document.getElementById('progress').style.display = 'none'
      return false
    }
  }
  async addToCart() {
    if(this.state.amount < 0) return false
    const res = await axios.post('/api/cart', {
      name: this.state.selectedItem,
      amount: this.state.amount
    })
    if(res.data.success) {
      await this.refreshCart()
      this.setState({
        isAmountModalOpen: false
      })
      return true
    } else {
      return false
    }
  }

  handleChange(e) {
    this.setState({
      [e.target.name]: e.target.checked
    })
  }

  render() {
    return (
      <div>
        <Modal 
          isOpen={this.state.isLoginModalOpen}
          onRequestClose={() => this.setState({isLoginModalOpen: false})}
          style={loginModalStyles}
          contentLabel="Login Modal"
        >
          <div style={{
            margin: 'auto'
          }}>
            <div style={{
              textAlign: 'center'
            }}>
              <span>로그인 해주세요</span>
            </div>
            <div style={{
              textAlign: 'center',
              marginTop: '20px'
            }}>
              <TextField
                onChange={this.handleTextChange.bind(this)}
                label="아이디"
                name="username"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><i className="fas fa-user"></i></InputAdornment>,
                }}
              />
            </div>
            <div style={{
              textAlign: 'center',
              marginTop: '20px'
            }}>
              <TextField
                label="비밀번호"
                onChange={this.handleTextChange.bind(this)}
                type="password"
                name="password"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><i className="fas fa-lock"></i></InputAdornment>,
                }}
              />
            </div>
            <div style={{
              textAlign: 'center'
            }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={this.state.checked}
                    onChange={this.handleChange.bind(this)}
                    name='checked'
                    value="checked"
                    color="primary"
                  />
                }
                label="아이디 기억하기"
              />
            </div>
            <div style={{
              textAlign: 'center'
            }}>
              <button onClick={this.tryLogin.bind(this)} id="login-btn" style={{
                width: '80%',
                height: '30px',
                shadows: 'none',
                border: 'none',
                backgroundColor: '#' + this.state.loginBtnColor,
                fontSize: '12px',
                color: 'white'
              }}>로그인</button>

            </div>
          </div>
        </Modal>
        <Modal 
          isOpen={this.state.isVoiceModalOpen}
          onRequestClose={() => this.setState({isVoiceModalOpen: false})}
          style={voiceModalStyles}
          contentLabel="Voice Modal"
        >
          <div id="progress"><LinearProgress /></div>
          <div style={{textAlign: 'right', marginRight: '5px', fontSize: '22px'}}><i className="fas fa-times" onClick={this.cancelRecording.bind(this)}></i></div>
          <div style={{textAlign: 'center', marginTop: '15px'}}>{this.state.recordMessage}</div>
          <div style={{textAlign: 'center', display: ((this.state.chunk) ? 'none': 'visible')}}>듣고 있습니다...</div>
        </Modal>
        <Modal 
          isOpen={this.state.isCartModalOpen}
          onRequestClose={() => this.setState({isCartModalOpen: false})}
          style={loginModalStyles}
          contentLabel="Shopping cart Modal"
        >
          {
            this.state.cart ? this.state.cart.map(item => {
              return (
                <div className="row">
                  <img style={{width: '40%'}} src={`/images/${item.name}.png`} alt={item.name} />
                  <div style={{display: 'inline-block', float: 'right', width: '50%', marginLeft: 'calc(10%)'}}>
                    <span style={{fontSize: '22px', marginBottom: '15px', display: 'block'}}>{this.state.itemsInKorean[item.name]}</span>
                    <span>{item.amount} 개</span>
                  </div>
                </div>
              )
            }) : ''
          }
        </Modal>
        <Modal 
          isOpen={this.state.isAmountModalOpen}
          onRequestClose={() => this.setState({isAmountModalOpen: false})}
          style={AmountModalStyles}
          contentLabel="Amount Modal"
        >
          <div className="row" style={{fontSize: '22px', marginBottom: '20px'}}>검색 결과</div>
          <div className="row">
            <img style={{width: '40%'}} src={`/images/${this.state.selectedItem}.png`} alt={this.state.selectedItem} />
            <div style={{display: 'inline-block', float: 'right', width: '50%', marginLeft: 'calc(10%)'}}>
              <span style={{fontSize: '22px', marginBottom: '15px', display: 'block'}}>{this.state.itemsInKorean[this.state.selectedItem]}</span>
              <FormControl
                aria-describedby="weight-helper-text"
              >
                <Input
                  id="adornment-weight"
                  value={this.state.weight}
                  name="amount"
                  onChange={this.handleTextChange.bind(this)}
                  endAdornment={<InputAdornment position="end">개</InputAdornment>}
                  inputProps={{
                    'aria-label': '갯수',
                  }}
                />
                <FormHelperText id="weight-helper-text">갯수</FormHelperText>
              </FormControl>
            </div>
          </div>
          <div className="row">
            <button onClick={this.addToCart.bind(this)} style={{
              backgroundColor: '#576843',
              boxShadow: '0 8px 16px 0 rgba(87, 104, 67, 0.37)',
              width: '55%',
              height: '40px',
              marginTop: '15px',
              fontSize: '17px',
              color: 'white',
              border: 'none'
            }}>장바구니에 담기</button>
          </div>
        </Modal>
        <header>
          <span id="title">Green Shop</span>
          <div id="login-area">
            <a style={{marginRight: '5px'}} href="#" onClick={() => this.setState({isCartModalOpen: true})}>장바구니</a>
            <a style={{marginLeft: '5px'}} href="#" onClick={this.openLoginModal.bind(this)}>{this.state.loginModalBtnText}</a>
          </div>
        </header>
        <div id="input-group">
          <input type="text"></input>
          <button type="submit"><i className="fas fa-search"></i></button>
        </div>
        <div className="row">
          <img id="countryside" src="/images/countryside-2326787_1920.png" onDoubleClick={() => this.setState({selectedItem: 'tomato', isAmountModalOpen: true})}></img>
        </div>
        <div id="divider">
          <span>상품 목록</span>
        </div>
        <div id="line" onClick={this.recordVoice.bind(this)}>
          <div id="btn" style={{
            backgroundColor: (this.state.loggedIn) ? '#576843' : 'grey'
          }}><i className="fas fa-microphone"></i> 음성으로 목록 추가하기</div>
        </div>
      </div>
    )
  }
}

window.onload = () => {
  ReactDOM.render(<App />, document.getElementById('container'))
  Modal.setAppElement('#container')
}
