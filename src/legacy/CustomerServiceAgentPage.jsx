import React, { useEffect, useMemo, useState } from 'react'
import {
  answerCustomerQuestion,
  buildCustomerServiceAnalytics,
  createFaq,
  createKnowledgeArticle,
  loadCustomerServiceWorkspace,
} from '../services/customerServiceAgent'

const CATEGORIES = ['Operations', 'Pricing', 'Registration', 'Support', 'General']

function formatStatus(status = '') {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatTime(value) {
  if (!value) return ''

  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value))
}

function MetricCard({ label, value, tone }) {
  return (
    <article className={`cs-metric-card ${tone || ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

export default function CustomerServiceAgentPage() {
  const [faqs, setFaqs] = useState([])
  const [knowledgeBase, setKnowledgeBase] = useState([])
  const [conversations, setConversations] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [chatForm, setChatForm] = useState({
    customerName: 'Customer',
    question: 'What are your operating hours?',
  })
  const [faqForm, setFaqForm] = useState({
    question: '',
    answer: '',
    category: 'General',
  })
  const [articleForm, setArticleForm] = useState({
    title: '',
    content: '',
    category: 'Support',
  })

  const analytics = useMemo(() => buildCustomerServiceAnalytics({
    conversations,
    tickets,
    faqs,
    knowledgeBase,
  }), [conversations, tickets, faqs, knowledgeBase])

  const escalatedConversations = conversations.filter((conversation) => conversation.status === 'escalated')
  const recentConversations = conversations.slice(0, 5)

  useEffect(() => {
    let ignore = false

    async function loadWorkspace() {
      setLoading(true)
      const workspace = await loadCustomerServiceWorkspace()

      if (ignore) return

      setFaqs(workspace.faqs)
      setKnowledgeBase(workspace.knowledgeBase)
      setConversations(workspace.conversations)
      setTickets(workspace.tickets)
      setLoading(false)
    }

    loadWorkspace()

    return () => {
      ignore = true
    }
  }, [])

  const handleAskQuestion = async (event) => {
    event.preventDefault()
    const question = chatForm.question.trim()
    if (!question) return

    setNotice('')
    const result = await answerCustomerQuestion({
      customerName: chatForm.customerName.trim() || 'Customer',
      question,
      faqs,
      knowledgeBase,
    })

    setConversations((current) => [result.conversation, ...current])
    if (result.ticket) {
      setTickets((current) => [result.ticket, ...current])
      setNotice(`Escalation ${result.ticket.id} dibuat untuk human support.`)
    } else {
      setNotice(`AI answered from ${result.matchType} with ${Math.round(result.confidence * 100)}% confidence.`)
    }
  }

  const handleCreateFaq = async (event) => {
    event.preventDefault()
    if (!faqForm.question.trim() || !faqForm.answer.trim()) return

    const savedFaq = await createFaq(faqForm)
    setFaqs((current) => [savedFaq, ...current])
    setFaqForm({ question: '', answer: '', category: 'General' })
    setNotice('FAQ added. Nexus AI can use it for future answers.')
  }

  const handleCreateArticle = async (event) => {
    event.preventDefault()
    if (!articleForm.title.trim() || !articleForm.content.trim()) return

    const savedArticle = await createKnowledgeArticle(articleForm)
    setKnowledgeBase((current) => [savedArticle, ...current])
    setArticleForm({ title: '', content: '', category: 'Support' })
    setNotice('Knowledge base article added.')
  }

  return (
    <div className="page cs-agent-page">
      <div className="cs-agent-header">
        <div>
          <span className="eyebrow">Nexus AI</span>
          <h2>Customer Service Agent</h2>
          <p>Digital employee for repetitive customer questions and human escalation.</p>
        </div>
        <div className="cs-agent-status">
          <span></span>
          24/7 Active
        </div>
      </div>

      <section className="cs-metric-grid" aria-label="Customer service dashboard metrics">
        <MetricCard label="Total Questions Today" value={analytics.totalQuestionsToday} />
        <MetricCard label="AI Resolved" value={analytics.aiResolved} tone="resolved" />
        <MetricCard label="Human Escalations" value={analytics.humanEscalations} tone="escalated" />
        <MetricCard label="Resolution Rate" value={`${analytics.resolutionRate}%`} tone="rate" />
      </section>

      {notice && <div className="cs-notice">{notice}</div>}

      <section className="cs-agent-layout">
        <div className="cs-panel cs-chat-engine">
          <div className="cs-panel-head">
            <span className="eyebrow">AI Chat Engine</span>
            <strong>Ask FAQ or KB</strong>
          </div>

          <form className="cs-form" onSubmit={handleAskQuestion}>
            <label>
              <span>Customer Name</span>
              <input
                type="text"
                value={chatForm.customerName}
                onChange={(event) => setChatForm((current) => ({ ...current, customerName: event.target.value }))}
              />
            </label>
            <label>
              <span>Question</span>
              <textarea
                value={chatForm.question}
                onChange={(event) => setChatForm((current) => ({ ...current, question: event.target.value }))}
              />
            </label>
            <button type="submit">Run AI Answer</button>
          </form>
        </div>

        <div className="cs-panel cs-kb-status">
          <div className="cs-panel-head">
            <span className="eyebrow">Knowledge Base Status</span>
            <strong>{analytics.knowledgeCount} sources</strong>
          </div>
          <div className="cs-kb-bars">
            {analytics.mostAskedCategories.map(([category, count]) => (
              <div className="cs-kb-row" key={category}>
                <span>{category}</span>
                <div><i style={{ width: `${Math.min(100, count * 24)}%` }}></i></div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cs-agent-layout">
        <div className="cs-panel">
          <div className="cs-panel-head">
            <span className="eyebrow">Knowledge Base</span>
            <strong>Add FAQ</strong>
          </div>
          <form className="cs-form" onSubmit={handleCreateFaq}>
            <label>
              <span>Question</span>
              <input
                type="text"
                value={faqForm.question}
                onChange={(event) => setFaqForm((current) => ({ ...current, question: event.target.value }))}
                placeholder="What are your operating hours?"
              />
            </label>
            <label>
              <span>Answer</span>
              <textarea
                value={faqForm.answer}
                onChange={(event) => setFaqForm((current) => ({ ...current, answer: event.target.value }))}
                placeholder="We operate Monday-Friday from 08:00 to 17:00."
              />
            </label>
            <label>
              <span>Category</span>
              <select
                value={faqForm.category}
                onChange={(event) => setFaqForm((current) => ({ ...current, category: event.target.value }))}
              >
                {CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <button type="submit">Add FAQ</button>
          </form>
        </div>

        <div className="cs-panel">
          <div className="cs-panel-head">
            <span className="eyebrow">Train AI Knowledge</span>
            <strong>Add Article</strong>
          </div>
          <form className="cs-form" onSubmit={handleCreateArticle}>
            <label>
              <span>Title</span>
              <input
                type="text"
                value={articleForm.title}
                onChange={(event) => setArticleForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Registration workflow"
              />
            </label>
            <label>
              <span>Content</span>
              <textarea
                value={articleForm.content}
                onChange={(event) => setArticleForm((current) => ({ ...current, content: event.target.value }))}
                placeholder="Explain policy, requirements, and escalation rules."
              />
            </label>
            <label>
              <span>Category</span>
              <select
                value={articleForm.category}
                onChange={(event) => setArticleForm((current) => ({ ...current, category: event.target.value }))}
              >
                {CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <button type="submit">Add Article</button>
          </form>
        </div>
      </section>

      <section className="cs-panel">
        <div className="cs-panel-head">
          <span className="eyebrow">Recent Conversations</span>
          <strong>{loading ? 'Loading' : `${conversations.length} total`}</strong>
        </div>
        <div className="cs-conversation-list">
          {recentConversations.map((conversation) => (
            <article className="cs-conversation" key={conversation.id}>
              <div>
                <strong>{conversation.customer_name}</strong>
                <span>{formatTime(conversation.created_at)}</span>
              </div>
              <p>{conversation.message}</p>
              <small>{conversation.ai_response}</small>
              <em className={conversation.status}>{formatStatus(conversation.status)}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="cs-agent-layout">
        <div className="cs-panel">
          <div className="cs-panel-head">
            <span className="eyebrow">Escalated Conversations</span>
            <strong>{escalatedConversations.length} need review</strong>
          </div>
          <div className="cs-ticket-list">
            {tickets.map((ticket) => (
              <article className="cs-ticket" key={ticket.id}>
                <div>
                  <strong>{ticket.id}</strong>
                  <span>{ticket.status}</span>
                </div>
                <p>{ticket.customer_name}</p>
                <small>{ticket.question || 'Question attached to conversation.'}</small>
              </article>
            ))}
          </div>
        </div>

        <div className="cs-panel">
          <div className="cs-panel-head">
            <span className="eyebrow">Analytics</span>
            <strong>Volume</strong>
          </div>
          <div className="cs-analytics-list">
            <div><span>AI Resolution %</span><strong>{analytics.resolutionRate}%</strong></div>
            <div><span>Human Resolution %</span><strong>{analytics.humanResolutionRate}%</strong></div>
            <div><span>Daily Volume</span><strong>{analytics.dailyVolume}</strong></div>
            <div><span>Weekly Volume</span><strong>{analytics.weeklyVolume}</strong></div>
          </div>
          <div className="cs-top-questions">
            <span>Top Questions</span>
            {analytics.topQuestions.map((question) => (
              <p key={question}>{question}</p>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
