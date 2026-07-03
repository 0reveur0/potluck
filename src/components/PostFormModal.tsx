import { motion } from 'framer-motion'
import { Carrot, ChefHat, HandHeart, Image, Loader as Loader2, Sparkles, Utensils, Wheat } from 'lucide-react'
import { useState } from 'react'
import { supabase, type FoodType, type PostType } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Modal } from '../lib/ui'
import { useToast } from '../lib/toast'

const FOOD_IMAGES = [
  'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/70497/pexels-photo-70497.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2611817/pexels-photo-2611817.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/4194618/pexels-photo-4194618.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2284166/pexels-photo-2284166.jpeg?auto=compress&cs=tinysrgb&w=800',
]

const FOOD_TYPES: { id: FoodType; label: string; icon: any; hint: string }[] = [
  { id: 'cooked_meal', label: 'Cooked Meal', icon: ChefHat, hint: 'A meal you cooked' },
  { id: 'ingredients', label: 'Ingredients', icon: Carrot, hint: 'Spare groceries' },
  { id: 'baking_supplies', label: 'Baking Supplies', icon: Wheat, hint: 'Flour, yeast, etc.' },
  { id: 'other', label: 'Other', icon: HandHeart, hint: 'Culinary help or favor' },
]

export function PostFormModal({
  open,
  kind,
  tableId,
  onClose,
  onCreated,
}: {
  open: boolean
  kind: PostType
  tableId: number | null
  onClose: () => void
  onCreated: () => void
}) {
  const { user } = useAuth()
  const { push } = useToast()
  const [foodType, setFoodType] = useState<FoodType>('cooked_meal')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [credits, setCredits] = useState(10)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const isOffer = kind === 'offer'
  const verb = isOffer ? 'Share' : 'Request'
  const noun = isOffer ? 'a Dish' : 'a Bite'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !tableId) return
    setErr(null)
    if (title.trim().length < 3) { setErr('Add a short title.'); return }
    if (!isOffer && credits <= 0) { setErr('Set a credit bounty for your request.'); return }
    setBusy(true)
    const { error } = await supabase.from('food_posts').insert({
      table_id: tableId,
      user_id: user.id,
      type: kind,
      title: title.trim(),
      description: description.trim(), // NOT NULL in schema; empty string is fine
      food_type: foodType,
      credit_price: isOffer ? 0 : credits,
      image_url: imageUrl,
      status: 'open',
    })
    if (error) { setErr(error.message); setBusy(false); return }
    setTitle(''); setDescription(''); setCredits(10); setImageUrl(null)
    push('success', isOffer ? 'Posted to your table! 🍲' : 'Request posted! 🙌')
    onCreated()
    setBusy(false)
  }

  return (
    <Modal open={open} onClose={onClose} title={`${verb} ${noun}`} maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Kind banner */}
        <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${isOffer ? 'bg-olive-400/15 text-olive-700' : 'bg-amber-400/15 text-amber-700'}`}>
          {isOffer ? <Utensils className="h-5 w-5" /> : <HandHeart className="h-5 w-5" />}
          <p className="text-sm font-medium">
            {isOffer
              ? 'Offer homemade food, extra groceries, or baking supplies to your table.'
              : 'Request a meal, a missing ingredient, or a cooking lesson — with a credit bounty.'}
          </p>
        </div>

        {/* Food type */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-charcoal-800">What is it?</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FOOD_TYPES.map((c) => {
              const Icon = c.icon
              const active = foodType === c.id
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setFoodType(c.id)}
                  className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 text-center transition-all ${
                    active ? 'border-amber-400 bg-amber-400/10' : 'border-cream-200 bg-white/60 hover:bg-cream-100'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-amber-600' : 'text-charcoal-700/70'}`} />
                  <span className="text-xs font-semibold text-charcoal-800">{c.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-charcoal-800">Title</label>
          <input
            className="input"
            placeholder={isOffer ? 'Fresh sourdough loaf' : 'Craving a bowl of pho'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-charcoal-800">Details</label>
          <textarea
            className="input min-h-[90px] resize-none"
            placeholder={isOffer ? 'Just out of the oven. Serves 2. Pickup tonight.' : 'Looking for someone to teach me dumpling folding this weekend.'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={400}
          />
        </div>

        {/* Image picker (offers) */}
        {isOffer && (
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-charcoal-800">
              <Image className="h-4 w-4" /> Photo
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {FOOD_IMAGES.map((url) => (
                <button
                  type="button"
                  key={url}
                  onClick={() => setImageUrl(imageUrl === url ? null : url)}
                  className={`relative aspect-square overflow-hidden rounded-xl transition-all ${
                    imageUrl === url ? 'ring-2 ring-amber-500' : 'ring-1 ring-cream-200 hover:opacity-80'
                  }`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-charcoal-700/60">Pick a stock photo to represent your share.</p>
          </div>
        )}

        {/* Credits (requests) */}
        {!isOffer && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-charcoal-800">Credit bounty</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={50}
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
                className="flex-1 accent-amber-500"
              />
              <div className="flex w-20 items-center justify-center gap-1 rounded-2xl bg-amber-400/15 px-3 py-2 font-bold text-amber-700">
                🪙 {credits}
              </div>
            </div>
            <p className="mt-1.5 text-xs text-charcoal-700/60">Frozen in escrow when someone accepts; released on dual confirmation.</p>
          </div>
        )}

        {err && <div className="rounded-2xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger">{err}</div>}

        <button onClick={submit} disabled={busy} className="btn-primary w-full">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isOffer ? 'Share it' : 'Post request'}
        </button>
      </div>
    </Modal>
  )
}
