"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  PenTool,
  RefreshCcw,
  LayoutGrid,
  Target,
  Wand2,
  Edit3,
  CheckCircle2,
  MessageSquare,
  Settings2,
  Globe2,
  Lightbulb,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="flex-1 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900">
            Skab <span className="text-blue-600">professionelt indhold</span>{" "}
            med din egen AI-kopi
          </h1>
          <p className="mt-6 text-lg text-gray-600">
            Din personlige AI-assistent der lærer din skrivestil og tone. Skab
            perfekt tilpasset indhold på få minutter - fra blogindlæg til
            webtekster. Spar tid og bevar din autentiske stemme.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg" className="text-lg" variant="secondary">
              <Link href="/dashboard">
                Start Gratis Nu <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          <div className="mt-6 flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Ingen kreditkort påkrævet
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Kom i gang på 2 minutter
            </div>
          </div>
        </div>
        <div className="flex-1 max-w-lg w-full">
          <div className="relative">
            <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 opacity-75 blur"></div>
            <div className="relative bg-white rounded-lg shadow-xl p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-600">
                    AI Analyserer Tone...
                  </span>
                </div>
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Registreret Stil: Professionel & Kortfattet
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Alt-i-én platform til professionelt indhold
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Skab, rediger og administrer alt dit indhold ét sted - designet
              til professionelle resultater
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card>
              <CardHeader>
                <Sparkles className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Ai-assisteret skrivning</CardTitle>
                <CardDescription>
                  Få hjælp til at skabe originalt indhold der matcher din tone
                  perfekt
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <PenTool className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Smart editor</CardTitle>
                <CardDescription>
                  Brugervenlig editor med alle de værktøjer du har brug for
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <RefreshCcw className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Intelligent omskrivning</CardTitle>
                <CardDescription>
                  Forbedr eksisterende tekster med ét klik
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <LayoutGrid className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Central styring</CardTitle>
                <CardDescription>
                  Hold styr på alt dit indhold med smart organisering
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Kom i gang på 4 nemme trin
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Så enkelt er det at skabe professionelt indhold med vores AI
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="relative">
              <div className="absolute top-0 right-0 -mr-6 mt-8 hidden lg:block">
                <div className="w-24 h-0.5 bg-blue-600"></div>
                <div className="absolute right-0 -mr-2 -mt-2 w-4 h-4 rounded-full border-2 border-blue-600 bg-white"></div>
              </div>
              <Card className="relative h-full">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>1. Upload eksempel</CardTitle>
                  <CardDescription>
                    Del et eksempel på din skrivestil eller tidligere indhold
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="relative">
              <div className="absolute top-0 right-0 -mr-6 mt-8 hidden lg:block">
                <div className="w-24 h-0.5 bg-blue-600"></div>
                <div className="absolute right-0 -mr-2 -mt-2 w-4 h-4 rounded-full border-2 border-blue-600 bg-white"></div>
              </div>
              <Card className="relative h-full">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <Wand2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>2. Ai lærer din stil</CardTitle>
                  <CardDescription>
                    Vores AI analyserer og forstår din unikke skrivestil
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="relative">
              <div className="absolute top-0 right-0 -mr-6 mt-8 hidden lg:block">
                <div className="w-24 h-0.5 bg-blue-600"></div>
                <div className="absolute right-0 -mr-2 -mt-2 w-4 h-4 rounded-full border-2 border-blue-600 bg-white"></div>
              </div>
              <Card className="relative h-full">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <Edit3 className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>3. Skab nyt indhold</CardTitle>
                  <CardDescription>
                    Få AI-genereret indhold der matcher din tone perfekt
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <Card className="relative h-full">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>4. Færdiggør & udgiv</CardTitle>
                <CardDescription>
                  Gennemse, juster og publicer dit nye indhold
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="mt-16 text-center">
            <p className="text-lg text-gray-600 mb-8">
              Slut med komplicerede indstillinger - vores AI tilpasser sig
              automatisk din stil og skaber autentisk indhold der lyder som dig.
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link href="/dashboard">
                Prøv Det Selv <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-white py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Intelligent indholdsanalyse
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Vores AI forstår og tilpasser sig automatisk din unikke skrivestil
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-8">
              <Card className="border-2 border-blue-100">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Stilanalyse</CardTitle>
                      <CardDescription className="mt-2">
                        AI'en analyserer disse nøgleelementer:
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-gray-50">
                      <span className="text-sm font-medium">Tone & Sprog</span>
                      <div className="mt-1 h-2 bg-gray-200 rounded-full">
                        <div className="w-3/4 h-2 bg-blue-600 rounded-full"></div>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50">
                      <span className="text-sm font-medium">
                        Fagligt Niveau
                      </span>
                      <div className="mt-1 h-2 bg-gray-200 rounded-full">
                        <div className="w-1/2 h-2 bg-blue-600 rounded-full"></div>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50">
                      <span className="text-sm font-medium">
                        Kommunikationsstil
                      </span>
                      <div className="mt-1 h-2 bg-gray-200 rounded-full">
                        <div className="w-4/5 h-2 bg-blue-600 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-100">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Settings2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Mønstergenkendelse</CardTitle>
                      <CardDescription className="mt-2">
                        AI identificerer dine unikke skrivemønstre
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-gray-50">
                      <span className="text-sm font-medium">
                        Sætningsstruktur
                      </span>
                      <p className="mt-1 text-sm text-gray-600">
                        Analyse af din typiske sætningslængde og kompleksitet
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50">
                      <span className="text-sm font-medium">Ordforråd</span>
                      <p className="mt-1 text-sm text-gray-600">
                        Forståelse af dine ordvalg og branchetermer
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50">
                      <span className="text-sm font-medium">Indholdsflow</span>
                      <p className="mt-1 text-sm text-gray-600">
                        Genkendelse af din afsnitsstruktur og overgange
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              <Card className="border-2 border-blue-100">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Globe2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Kontekstuel Forståelse</CardTitle>
                      <CardDescription className="mt-2">
                        Dyb forståelse af din indholdskontekst
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-gray-50">
                      <span className="text-sm font-medium">
                        Branchekontekst
                      </span>
                      <p className="mt-1 text-sm text-gray-600">
                        Tilpasser sig din specifikke brancheterminologi og
                        standarder
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50">
                      <span className="text-sm font-medium">
                        Målgruppeniveau
                      </span>
                      <p className="mt-1 text-sm text-gray-600">
                        Matcher indhold til din målgruppes forståelsesniveau
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50">
                      <span className="text-sm font-medium">
                        Brandidentitet
                      </span>
                      <p className="mt-1 text-sm text-gray-600">
                        Opretholder konsistens med din brands personlighed
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-100">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Lightbulb className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Kontinuerlig Læring</CardTitle>
                      <CardDescription className="mt-2">
                        AI der udvikler sig med din skrivestil
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-gray-50">
                      <span className="text-sm font-medium">Stiludvikling</span>
                      <p className="mt-1 text-sm text-gray-600">
                        Tilpasser sig efterhånden som din skrivestil udvikler
                        sig
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50">
                      <span className="text-sm font-medium">
                        Indholdshistorik
                      </span>
                      <p className="mt-1 text-sm text-gray-600">
                        Lærer af din indholdsproduktionshistorik
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50">
                      <span className="text-sm font-medium">
                        Feedback Integration
                      </span>
                      <p className="mt-1 text-sm text-gray-600">
                        Integrerer dine redigeringer og præferencer
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-16 text-center">
            <p className="text-lg text-gray-600 mb-8">
              Oplev kraften i AI, der virkelig forstår din stemme. Intet manuelt
              stilvalg nødvendigt - bare skriv naturligt, og lad vores AI klare
              resten.
            </p>
            <Button asChild size="lg" variant="outline">
              <Link href="/dashboard">
                Prøv AI Stilgenkendelse <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-50 py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
            Klar til at revolutionere din indholdsproduktion?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Prøv gratis i dag og oplev kraften ved AI-assisteret
            indholdsproduktion
          </p>
          <Button asChild size="lg" className="text-lg" variant="secondary">
            <Link href="/dashboard">
              Start din gratis prøveperiode{" "}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-4 text-sm text-gray-500">
            Ingen binding - opsig når som helst
          </p>
        </div>
      </section>
    </div>
  );
}
