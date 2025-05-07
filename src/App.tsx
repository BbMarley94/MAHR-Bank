import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

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
  const [isLoading, setIsLoading] = useState(true)
  const [bbMarleyId, setBbMarleyId] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
    fetchTransactions()
    ensureBbMarleyAccount()
    setIsLoading(false)
  }, [])

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
          balance: parseFloat(newUserBalance),
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
    fetchUsers()
  }

  async function deleteUser(id: string) {
    // Delete transactions where the user is the source
    const { error: fromError } = await supabase
      .from('transactions')
      .delete()
      .eq('from_character_id', id)

    if (fromError) {
      console.error('Error deleting transactions (from):', fromError)
      alert('Error deleting transactions (from): ' + fromError.message)
      return
    }

    // Delete transactions where the user is the target
    const { error: toError } = await supabase
      .from('transactions')
      .delete()
      .eq('to_character_id', id)

    if (toError) {
      console.error('Error deleting transactions (to):', toError)
      alert('Error deleting transactions (to): ' + toError.message)
      return
    }

    // Delete the user
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

    const amount = parseFloat(transferAmount)
    const fee = amount * 0.08 // 8% fee
    const totalDeduction = amount + fee // Total amount to deduct from sender
    
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
          amount: amount // Full transfer amount goes to recipient
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
          balance: fromChar.balance - totalDeduction, // Deduct both amount and fee
          user_id: fromChar.user_id
        },
        { 
          id: toChar.id, 
          name: toChar.name,
          balance: toChar.balance + amount, // Receive full amount
          user_id: toChar.user_id
        },
        {
          id: bbMarley.id,
          name: bbMarley.name,
          balance: bbMarley.balance + fee,
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
    fetchUsers()
    fetchTransactions()
  }

  async function withdrawCash(e: React.FormEvent) {
    e.preventDefault()
    
    const amount = parseFloat(withdrawalAmount)
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
      .update({ balance: user.balance - amount })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating balance:', updateError)
      return
    }

    setWithdrawalUser('')
    setWithdrawalAmount('')
    fetchUsers()
    fetchTransactions()
  }

  async function addFunds(e: React.FormEvent) {
    e.preventDefault()
    
    if (!bbMarleyId) {
      alert('System error: Fee collector account not found')
      return
    }

    const amount = parseFloat(addFundsAmount)
    const fee = amount * 0.05 // 5% fee
    const actualAmount = amount - fee
    
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
          balance: user.balance + actualAmount,
          user_id: user.user_id
        },
        {
          id: bbMarley.id,
          name: bbMarley.name,
          balance: bbMarley.balance + fee,
          user_id: bbMarley.user_id
        }
      ])

    if (updateError) {
      console.error('Error updating balance:', updateError)
      return
    }

    setAddFundsUser('')
    setAddFundsAmount('')
    fetchUsers()
    fetchTransactions()
  }

  const renderActionsTab = () => {
    return (
      <>
        <div className="bank-card p-6 rounded-lg mb-8">
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
                placeholder="Initial Balance"
                value={newUserBalance}
                onChange={(e) => setNewUserBalance(e.target.value)}
                className="bank-input w-full p-3 rounded-lg"
                required
              />
            </div>
            <button
              type="submit"
              className="bank-button text-white px-6 py-3 rounded-lg w-full font-semibold"
            >
              Create Account
            </button>
          </form>
        </div>

        <div className="bank-card p-6 rounded-lg mb-8">
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
                  <option key={user.id} value={user.id}>{user.name} (Balance: ${user.balance})</option>
                ))}
              </select>
            </div>
            <div>
              <input
                type="number"
                placeholder="Amount to Add"
                value={addFundsAmount}
                onChange={(e) => setAddFundsAmount(e.target.value)}
                className="bank-input w-full p-3 rounded-lg"
                required
              />
            </div>
            <button
              type="submit"
              className="bank-button text-white px-6 py-3 rounded-lg w-full font-semibold"
            >
              Add Funds
            </button>
          </form>
        </div>

        <div className="bank-card p-6 rounded-lg mb-8">
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
                  <option key={user.id} value={user.id}>{user.name} (Balance: ${user.balance})</option>
                ))}
              </select>
            </div>
            <div>
              <input
                type="number"
                placeholder="Withdrawal Amount"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                className="bank-input w-full p-3 rounded-lg"
                required
              />
            </div>
            <button
              type="submit"
              className="bank-button text-white px-6 py-3 rounded-lg w-full font-semibold"
            >
              Withdraw Cash
            </button>
          </form>
        </div>

        <div className="bank-card p-6 rounded-lg">
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
                  <option key={user.id} value={user.id}>{user.name} (Balance: ${user.balance})</option>
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
                  <option key={user.id} value={user.id}>{user.name} (Balance: ${user.balance})</option>
                ))}
              </select>
            </div>
            <div>
              <input
                type="number"
                placeholder="Amount"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="bank-input w-full p-3 rounded-lg"
                required
              />
            </div>
            <button
              type="submit"
              className="bank-button text-white px-6 py-3 rounded-lg w-full font-semibold"
            >
              Transfer Money
            </button>
          </form>
        </div>
      </>
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

    return (
      <div className="bank-card p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-copper">Accounts (Alphabetical)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map(user => (
            <div key={user.id} className="p-4 border rounded-lg bg-gradient-to-br from-white to-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{user.name}</h3>
                  <p className="text-copper font-medium">Balance: ${user.balance}</p>
                </div>
                {user.name !== 'Bb Marley' && (
                  <button
                    onClick={() => deleteUser(user.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
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
                    `${fromUser?.name} added $${tx.amount} in funds`
                  ) : isCashWithdrawal ? (
                    `${fromUser?.name} withdrew $${tx.amount} in cash`
                  ) : (
                    `From: ${fromUser?.name} → To: ${toUser?.name}`
                  )}
                </p>
                <p className="text-copper">Amount: ${tx.amount}</p>
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
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4 text-white">MAHR Bank</h1>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setCurrentView('actions')}
              className={`px-6 py-2 rounded-lg transition-all ${
                currentView === 'actions'
                  ? 'bank-button text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Actions
            </button>
            <button
              onClick={() => setCurrentView('users')}
              className={`px-6 py-2 rounded-lg transition-all ${
                currentView === 'users'
                  ? 'bank-button text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Accounts
            </button>
            <button
              onClick={() => setCurrentView('transactions')}
              className={`px-6 py-2 rounded-lg transition-all ${
                currentView === 'transactions'
                  ? 'bank-button text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Transactions
            </button>
          </div>
        </div>

        {currentView === 'actions' && renderActionsTab()}
        {currentView === 'users' && renderUsersTab()}
        {currentView === 'transactions' && renderTransactionsTab()}
      </div>
    </div>
  )
}

export default App