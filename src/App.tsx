import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import './App.css'
import { Header } from './components/Header'
import { Footer } from './components/Footer'

interface User {
  id: string
  name: string
  balance: number
  user_id: string
}

interface Transaction {
  id: string
  from_character_id: string
  to_character_id: string
  amount: number
  created_at: string
}

type View = 'actions' | 'users' | 'transactions'
type ActionType = 'new-account' | 'add-funds' | 'withdraw' | 'transfer' | null
type SortField = 'name' | 'balance'
type SortOrder = 'asc' | 'desc'

function App() {
  const [users, setUsers] = useState<User[]>([])
  const [newUserName, setNewUserName] = useState('')
  const [newUserBalance, setNewUserBalance] = useState('')
  const [fromUser, setFromUser] = useState('')
  const [toUser, setToUser] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [withdrawalUser, setWithdrawalUser] = useState('')
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [addFundsUser, setAddFundsUser] = useState('')
  const [addFundsAmount, setAddFundsAmount] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [currentView, setCurrentView] = useState<View>('actions')
  const [selectedAction, setSelectedAction] = useState<ActionType>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [bbMarleyId, setBbMarleyId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  useEffect(() => {
    fetchUsers()
    fetchTransactions()
    ensureBbMarleyAccount()
    setIsLoading(false)
  }, [])

  const formatNumber = (num: number) => {
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  async function ensureBbMarleyAccount() {
    const { data: existingUser } = await supabase
      .from('characters')
      .select('id')
      .eq('name', 'Bb Marley')
      .single()

    if (existingUser) {
      setBbMarleyId(existingUser.id)
      return
    }

    const { data: newUser, error } = await supabase
      .from('characters')
      .insert([
        {
          name: 'Bb Marley',
          balance: 0,
          user_id: '00000000-0000-0000-0000-000000000000'
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating Bb Marley account:', error)
      return
    }

    setBbMarleyId(newUser.id)
  }

  async function fetchUsers() {
    const { data, error } = await supabase
      .from('characters')
      .select('id, name, balance, user_id')
      .order('name', { ascending: true })
    
    if (error) {
      console.error('Error fetching users:', error)
      return
    }
    
    setUsers(data)
  }

  async function fetchTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching transactions:', error)
      return
    }
    
    setTransactions(data)
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault()
    
    const { error } = await supabase
      .from('characters')
      .insert([
        { 
          name: newUserName,
          balance: parseFloat(parseFloat(newUserBalance).toFixed(2)),
          user_id: '00000000-0000-0000-0000-000000000000'
        }
      ])

    if (error) {
      if (error.code === '23505') {
        alert('A user with this name already exists')
      } else {
        console.error('Error adding user:', error)
        alert('Error adding character: ' + error.message)
      }
      return
    }

    setNewUserName('')
    setNewUserBalance('')
    setSelectedAction(null)
    fetchUsers()
  }

  async function deleteUser(id: string) {
    const { error: userError } = await supabase
      .from('characters')
      .delete()
      .eq('id', id)

    if (userError) {
      console.error('Error deleting user:', userError)
      alert('Error deleting user: ' + userError.message)
      return
    }

    fetchUsers()
    fetchTransactions()
  }

  async function transferMoney(e: React.FormEvent) {
    e.preventDefault()
    
    if (!bbMarleyId) {
      alert('System error: Fee collector account not found')
      return
    }

    const amount = parseFloat(parseFloat(transferAmount).toFixed(2))
    const fee = parseFloat((amount * 0.08).toFixed(2)) // 8% fee
    const totalDeduction = parseFloat((amount + fee).toFixed(2)) // Total amount to deduct from sender
    
    const fromChar = users.find(c => c.id === fromUser)
    const toChar = users.find(c => c.id === toUser)
    const bbMarley = users.find(c => c.id === bbMarleyId)

    if (!fromChar || !toChar || !bbMarley) return

    if (fromChar.balance < totalDeduction) {
      alert('Insufficient funds (including 8% fee)')
      return
    }
    
    // Create transaction records
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert([
        {
          from_character_id: fromUser,
          to_character_id: toUser,
          amount: amount
        },
        {
          from_character_id: fromUser,
          to_character_id: bbMarleyId,
          amount: fee
        }
      ])

    if (transactionError) {
      console.error('Error creating transaction:', transactionError)
      return
    }

    // Update balances
    const { error: updateError } = await supabase
      .from('characters')
      .upsert([
        { 
          id: fromChar.id, 
          name: fromChar.name,
          balance: parseFloat((fromChar.balance - totalDeduction).toFixed(2)),
          user_id: fromChar.user_id
        },
        { 
          id: toChar.id, 
          name: toChar.name,
          balance: parseFloat((toChar.balance + amount).toFixed(2)),
          user_id: toChar.user_id
        },
        {
          id: bbMarley.id,
          name: bbMarley.name,
          balance: parseFloat((bbMarley.balance + fee).toFixed(2)),
          user_id: bbMarley.user_id
        }
      ])

    if (updateError) {
      console.error('Error updating balances:', updateError)
      return
    }

    setFromUser('')
    setToUser('')
    setTransferAmount('')
    setSelectedAction(null)
    fetchUsers()
    fetchTransactions()
  }

  async function withdrawCash(e: React.FormEvent) {
    e.preventDefault()
    
    const amount = parseFloat(parseFloat(withdrawalAmount).toFixed(2))
    const user = users.find(u => u.id === withdrawalUser)
    
    if (!user) return
    
    if (user.balance < amount) {
      alert('Insufficient balance')
      return
    }

    const { error: transactionError } = await supabase
      .from('transactions')
      .insert([
        {
          from_character_id: withdrawalUser,
          to_character_id: withdrawalUser,
          amount: amount
        }
      ])

    if (transactionError) {
      console.error('Error creating withdrawal transaction:', transactionError)
      return
    }

    const { error: updateError } = await supabase
      .from('characters')
      .update({ balance: parseFloat((user.balance - amount).toFixed(2)) })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating balance:', updateError)
      return
    }

    setWithdrawalUser('')
    setWithdrawalAmount('')
    setSelectedAction(null)
    fetchUsers()
    fetchTransactions()
  }

  async function addFunds(e: React.FormEvent) {
    e.preventDefault()
    
    if (!bbMarleyId) {
      alert('System error: Fee collector account not found')
      return
    }

    const amount = parseFloat(parseFloat(addFundsAmount).toFixed(2))
    const fee = parseFloat((amount * 0.05).toFixed(2)) // 5% fee
    const actualAmount = parseFloat((amount - fee).toFixed(2))
    
    const user = users.find(u => u.id === addFundsUser)
    const bbMarley = users.find(c => c.id === bbMarleyId)
    
    if (!user || !bbMarley) return

    const { error: transactionError } = await supabase
      .from('transactions')
      .insert([
        {
          from_character_id: addFundsUser,
          to_character_id: addFundsUser,
          amount: actualAmount
        },
        {
          from_character_id: addFundsUser,
          to_character_id: bbMarleyId,
          amount: fee
        }
      ])

    if (transactionError) {
      console.error('Error creating add funds transaction:', transactionError)
      return
    }

    const { error: updateError } = await supabase
      .from('characters')
      .upsert([
        {
          id: user.id,
          name: user.name,
          balance: parseFloat((user.balance + actualAmount).toFixed(2)),
          user_id: user.user_id
        },
        {
          id: bbMarley.id,
          name: bbMarley.name,
          balance: parseFloat((bbMarley.balance + fee).toFixed(2)),
          user_id: bbMarley.user_id
        }
      ])

    if (updateError) {
      console.error('Error updating balance:', updateError)
      return
    }

    setAddFundsUser('')
    setAddFundsAmount('')
    setSelectedAction(null)
    fetchUsers()
    fetchTransactions()
  }

  const renderActionsTab = () => {
    const actionButtons = [
      { type: 'new-account', label: 'New Account', icon: '👤' },
      { type: 'add-funds', label: 'Add Funds', icon: '💰' },
      { type: 'withdraw', label: 'Withdraw Cash', icon: '💵' },
      { type: 'transfer', label: 'Transfer Money', icon: '↔️' },
    ]

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {actionButtons.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => setSelectedAction(type as ActionType)}
              className={`bank-card p-6 text-center transition-all ${
                selectedAction === type 
                  ? 'ring-2 ring-copper shadow-lg' 
                  : 'hover:shadow-md'
              }`}
            >
              <div className="text-3xl mb-2">{icon}</div>
              <div className="font-semibold text-gray-800">{label}</div>
            </button>
          ))}
        </div>

        {selectedAction && (
          <div className="bank-card p-6 animate-fade-in">
            {selectedAction === 'new-account' && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-copper">New Account</h2>
                <form onSubmit={addUser} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Account Holder Name"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="bank-input w-full p-3 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Initial Balance"
                      value={newUserBalance}
                      onChange={(e) => setNewUserBalance(e.target.value)}
                      className="bank-input w-full p-3 rounded-lg"
                      required
                    />
                  </div>
                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      className="bank-button text-white px-6 py-3 rounded-lg flex-1 font-semibold"
                    >
                      Create Account
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAction(null)}
                      className="px-6 py-3 rounded-lg flex-1 font-semibold border border-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {selectedAction === 'add-funds' && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-copper">Add Funds</h2>
                <p className="text-sm text-gray-600 mb-4">Note: A 5% fee will be deducted from the deposited amount</p>
                <form onSubmit={addFunds} className="space-y-4">
                  <div>
                    <select
                      value={addFundsUser}
                      onChange={(e) => setAddFundsUser(e.target.value)}
                      className="bank-input w-full p-3 rounded-lg"
                      required
                    >
                      <option value="">Select Account</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>{user.name} (Balance: ${formatNumber(user.balance)})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Amount to Add"
                      value={addFundsAmount}
                      onChange={(e) => setAddFundsAmount(e.target.value)}
                      className="bank-input w-full p-3 rounded-lg"
                      required
                    />
                  </div>
                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      className="bank-button text-white px-6 py-3 rounded-lg flex-1 font-semibold"
                    >
                      Add Funds
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAction(null)}
                      className="px-6 py-3 rounded-lg flex-1 font-semibold border border-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {selectedAction === 'withdraw' && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-copper">Cash Withdrawal</h2>
                <form onSubmit={withdrawCash} className="space-y-4">
                  <div>
                    <select
                      value={withdrawalUser}
                      onChange={(e) => setWithdrawalUser(e.target.value)}
                      className="bank-input w-full p-3 rounded-lg"
                      required
                    >
                      <option value="">Select Account</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>{user.name} (Balance: ${formatNumber(user.balance)})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Withdrawal Amount"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      className="bank-input w-full p-3 rounded-lg"
                      required
                    />
                  </div>
                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      className="bank-button text-white px-6 py-3 rounded-lg flex-1 font-semibold"
                    >
                      Withdraw Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAction(null)}
                      className="px-6 py-3 rounded-lg flex-1 font-semibold border border-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {selectedAction === 'transfer' && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-copper">Transfer Money</h2>
                <p className="text-sm text-gray-600 mb-4">Note: An 8% fee will be charged to the sender in addition to the transfer amount</p>
                <form onSubmit={transferMoney} className="space-y-4">
                  <div>
                    <select
                      value={fromUser}
                      onChange={(e) => setFromUser(e.target.value)}
                      className="bank-input w-full p-3 rounded-lg"
                      required
                    >
                      <option value="">From Account</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>{user.name} (Balance: ${formatNumber(user.balance)})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select
                      value={toUser}
                      onChange={(e) => setToUser(e.target.value)}
                      className="bank-input w-full p-3 rounded-lg"
                      required
                    >
                      <option value="">To Account</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>{user.name} (Balance: ${formatNumber(user.balance)})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Amount"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="bank-input w-full p-3 rounded-lg"
                      required
                    />
                  </div>
                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      className="bank-button text-white px-6 py-3 rounded-lg flex-1 font-semibold"
                    >
                      Transfer Money
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAction(null)}
                      className="px-6 py-3 rounded-lg flex-1 font-semibold border border-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderUsersTab = () => {
    if (isLoading) {
      return (
        <div className="bank-card p-6 rounded-lg">
          <p className="text-center text-gray-600">Loading...</p>
        </div>
      )
    }

    const filteredUsers = users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const sortedUsers = [...filteredUsers].sort((a, b) => {
      if (sortField === 'name') {
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      } else {
        return sortOrder === 'asc'
          ? a.balance - b.balance
          : b.balance - a.balance
      }
    })

    const toggleSort = (field: SortField) => {
      if (sortField === field) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
      } else {
        setSortField(field)
        setSortOrder('asc')
      }
    }

    return (
      <div className="space-y-6">
        <div className="bank-card p-6 rounded-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bank-input w-full pl-10 pr-4 py-2 rounded-lg"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                🔍
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleSort('name')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  sortField === 'name'
                    ? 'bg-copper text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => toggleSort('balance')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  sortField === 'balance'
                    ? 'bg-copper text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Balance {sortField === 'balance' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedUsers.map(user => (
              <div
                key={user.id}
                className="bank-card p-6 rounded-lg bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-xl">{user.name}</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                      <p className="text-copper font-medium text-lg">
                        ${formatNumber(user.balance)}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500">
                      Account ID: {user.id.slice(0, 8)}...
                    </p>
                  </div>
                  {user.name !== 'Bb Marley' && (
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="text-red-500 hover:text-red-700 transition-colors p-2 hover:bg-red-50 rounded-full"
                    >
                      ❌
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {sortedUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No accounts found matching "{searchTerm}"
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderTransactionsTab = () => {
    if (isLoading) {
      return (
        <div className="bank-card p-6 rounded-lg">
          <p className="text-center text-gray-600">Loading...</p>
        </div>
      )
    }

    return (
      <div className="bank-card p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-copper">Recent Transactions</h2>
        <div className="space-y-4">
          {transactions.map(tx => {
            const fromUser = users.find(c => c.id === tx.from_character_id)
            const toUser = users.find(c => c.id === tx.to_character_id)
            const isCashWithdrawal = tx.from_character_id === tx.to_character_id && toUser?.name !== 'Bb Marley'
            const isAddFunds = tx.from_character_id === tx.to_character_id && tx.amount > 0 && toUser?.name !== 'Bb Marley'
            const isFee = toUser?.name === 'Bb Marley'
            
            return (
              <div key={tx.id} className="p-4 border rounded-lg bg-gradient-to-br from-white to-gray-50">
                <p className="font-medium">
                  {isFee ? (
                    `Fee payment from ${fromUser?.name} to Bb Marley`
                  ) : isAddFunds ? (
                    `${fromUser?.name} added $${formatNumber(tx.amount)} in funds`
                  ) : isCashWithdrawal ? (
                    `${fromUser?.name} withdrew $${formatNumber(tx.amount)} in cash`
                  ) : (
                    `From: ${fromUser?.name} → To: ${toUser?.name}`
                  )}
                </p>
                <p className="text-copper">Amount: ${formatNumber(tx.amount)}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {new Date(tx.created_at).toLocaleString()}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 px-8 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center space-x-4 mb-8">
            <button
              onClick={() => {
                setCurrentView('actions')
                setSelectedAction(null)
              }}
              className={`px-6 py-2 rounded-lg transition-all ${
                currentView === 'actions'
                  ? 'bank-button text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Actions
            </button>
            <button
              onClick={() => {
                setCurrentView('users')
                setSelectedAction(null)
              }}
              className={`px-6 py-2 rounded-lg transition-all ${
                currentView === 'users'
                  ? 'bank-button text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Accounts
            </button>
            <button
              onClick={() => {
                setCurrentView('transactions')
                setSelectedAction(null)
              }}
              className={`px-6 py-2 rounded-lg transition-all ${
                currentView === 'transactions'
                  ? 'bank-button text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Transactions
            </button>
          </div>

          {currentView === 'actions' && renderActionsTab()}
          {currentView === 'users' && renderUsersTab()}
          {currentView === 'transactions' && renderTransactionsTab()}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default App