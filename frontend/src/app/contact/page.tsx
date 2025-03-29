// frontend/src/app/contact/page.tsx

'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Icons } from '@/components/ui/icons'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

// Define schema for form validation
const contactSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  subject: z
    .string()
    .min(5, { message: 'Subject must be at least 5 characters' }),
  message: z
    .string()
    .min(10, { message: 'Message must be at least 10 characters' }),
})

type ContactFormValues = z.infer<typeof contactSchema>

export default function Contact() {
  const [submitted, setSubmitted] = useState(false)

  // Initialize form with react-hook-form + zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
  })

  const onSubmit = async (data: ContactFormValues) => {
    try {
      // In a real app, you would send the data to your backend
      console.log('Contact form data:', data)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Show success message
      setSubmitted(true)
      toast.success('Your message has been sent!')
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message. Please try again.')
    }
  }

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-2 text-center">Contact Us</h1>
        <p className="text-gray-600 dark:text-gray-300 text-center mb-8">
          Have questions or feedback? We'd love to hear from you.
        </p>

        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-600"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Message Sent!
            </h3>
            <p className="text-green-700 mb-4">
              Thank you for reaching out. We'll get back to you as soon as
              possible.
            </p>
            <Button onClick={() => setSubmitted(false)}>
              Send Another Message
            </Button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 md:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    className={errors.name ? 'border-red-300' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    className={errors.email ? 'border-red-300' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  {...register('subject')}
                  className={errors.subject ? 'border-red-300' : ''}
                />
                {errors.subject && (
                  <p className="text-sm text-red-500">
                    {errors.subject.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  rows={5}
                  {...register('message')}
                  className={errors.message ? 'border-red-300' : ''}
                />
                {errors.message && (
                  <p className="text-sm text-red-500">
                    {errors.message.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full md:w-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Message'
                )}
              </Button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  )
}
