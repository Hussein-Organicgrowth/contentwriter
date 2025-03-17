"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Edit } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IWebsite } from "@/models/Website";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
	name: z.string().min(2, {
		message: "Company name must be at least 2 characters.",
	}),
	website: z.string().url({
		message: "Please enter a valid URL.",
	}),
	description: z.string().min(10, {
		message: "Description must be at least 10 characters.",
	}),
	toneofvoice: z.string().min(3, {
		message: "Tone of voice must be at least 3 characters.",
	}),
	targetAudience: z.string().min(3, {
		message: "Target audience must be at least 3 characters.",
	}),
});

interface EditWebsiteDialogProps {
	website: IWebsite;
	onUpdate: () => void;
	children?: React.ReactNode;
}

export function EditWebsiteDialog({
	website,
	onUpdate,
	children,
}: EditWebsiteDialogProps) {
	const [open, setOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const router = useRouter();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: website.name,
			website: website.website,
			description: website.description,
			toneofvoice: website.toneofvoice,
			targetAudience: website.targetAudience,
		},
	});

	// Reset form values when website changes or dialog opens
	useEffect(() => {
		if (open) {
			form.reset({
				name: website.name,
				website: website.website,
				description: website.description,
				toneofvoice: website.toneofvoice,
				targetAudience: website.targetAudience,
			});
		}
	}, [website, open, form]);

	async function onSubmit(values: z.infer<typeof formSchema>) {
		setIsSubmitting(true);
		try {
			const response = await fetch(`/api/website/${website._id}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(values),
			});

			if (!response.ok) {
				throw new Error("Failed to update website");
			}

			toast.success("Website updated successfully");
			setOpen(false);
			onUpdate();
			router.refresh();
		} catch (error) {
			console.error("Error updating website:", error);
			toast.error("Failed to update website");
		} finally {
			setIsSubmitting(false);
		}
	}

	// Handle click on the edit button to prevent event propagation
	const handleEditButtonClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		setOpen(true);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{children || (
					<Button
						variant="ghost"
						size="icon"
						className="text-muted-foreground hover:text-primary hover:bg-primary/10"
						onClick={handleEditButtonClick}>
						<Edit className="h-4 w-4" />
					</Button>
				)}
			</DialogTrigger>
			<DialogContent
				className="sm:max-w-[800px] max-h-[95vh] overflow-y-auto p-6 md:p-8"
				onPointerDownOutside={(e) => {
					// Prevent clicks outside the dialog from propagating to parent elements
					e.preventDefault();
				}}
				onClick={(e) => {
					// Prevent clicks inside the dialog from propagating to parent elements
					e.stopPropagation();
				}}>
				<DialogHeader className="mb-6">
					<DialogTitle className="text-2xl">Edit Company Details</DialogTitle>
					<DialogDescription className="text-base mt-2">
						Update your company information and preferences.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-8"
						onClick={(e) => e.stopPropagation()}>
						<div className="grid gap-6 md:grid-cols-2">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="text-base font-medium">
											Company Name
										</FormLabel>
										<FormControl>
											<Input
												placeholder="Acme Inc."
												{...field}
												className="h-12 text-base px-4 py-3 rounded-md"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="website"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="text-base font-medium">
											Website URL
										</FormLabel>
										<FormControl>
											<Input
												placeholder="https://example.com"
												{...field}
												className="h-12 text-base px-4 py-3 rounded-md"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-base font-medium">
										Company Description
									</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Describe your company and what it does..."
											className="min-h-[150px] text-base px-4 py-3 leading-relaxed rounded-md"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="toneofvoice"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-base font-medium">
										Tone of Voice
									</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Professional, friendly, casual..."
											className="min-h-[200px] text-base px-4 py-3 leading-relaxed rounded-md"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="targetAudience"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-base font-medium">
										Target Audience
									</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Small business owners, tech enthusiasts..."
											className="min-h-[200px] text-base px-4 py-3 leading-relaxed rounded-md"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter className="pt-6 flex flex-col sm:flex-row gap-3">
							<Button
								type="button"
								variant="outline"
								onClick={(e) => {
									e.stopPropagation();
									setOpen(false);
								}}
								className="w-full sm:w-auto order-2 sm:order-1 h-12">
								Cancel
							</Button>
							<Button
								type="submit"
								variant="secondary"
								disabled={isSubmitting}
								onClick={(e) => e.stopPropagation()}
								className="w-full sm:w-auto order-1 sm:order-2 h-12">
								{isSubmitting ? "Updating..." : "Update Company"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
