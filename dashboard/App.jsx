import React, { useState, useMemo } from 'react';

// Sample NSO data - in production, this would come from your monitoring API
const sampleNSOData = [
  { country: "Afghanistan", region: "Asia", organization: "National Statistics and Information Authority", url: "https://www.nsia.gov.af", currentStatus: "up", uptimeHistory: [1,1,1,0,0,0,1,1,1,1,1,1] },
  { country: "Albania", region: "Europe", organization: "Institute of Statistics", url: "http://www.instat.gov.al", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Algeria", region: "Africa", organization: "Office National des Statistiques", url: "http://www.ons.dz", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Angola", region: "Africa", organization: "Instituto Nacional de Estatística", url: "https://www.ine.gov.ao", currentStatus: "down", uptimeHistory: [1,0,0,1,1,0,0,0,1,1,0,0] },
  { country: "Argentina", region: "Americas", organization: "Instituto Nacional de Estadística y Censos", url: "https://www.indec.gob.ar", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Armenia", region: "Asia", organization: "Statistical Committee of Armenia", url: "https://www.armstat.am", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Australia", region: "Oceania", organization: "Australian Bureau of Statistics", url: "https://www.abs.gov.au", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Austria", region: "Europe", organization: "Statistics Austria", url: "https://www.statistik.at", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Azerbaijan", region: "Asia", organization: "State Statistical Committee", url: "https://www.stat.gov.az", currentStatus: "up", uptimeHistory: [1,1,1,1,1,0,1,1,1,1,1,1] },
  { country: "Bahamas", region: "Americas", organization: "Department of Statistics", url: "https://www.bahamas.gov.bs/statistics", currentStatus: "unknown", uptimeHistory: [1,1,null,null,1,1,1,1,null,1,1,1] },
  { country: "Bangladesh", region: "Asia", organization: "Bangladesh Bureau of Statistics", url: "http://www.bbs.gov.bd", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Barbados", region: "Americas", organization: "Barbados Statistical Service", url: "https://stats.gov.bb", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,0,1] },
  { country: "Belarus", region: "Europe", organization: "National Statistical Committee", url: "https://www.belstat.gov.by", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Belgium", region: "Europe", organization: "Statistics Belgium", url: "https://statbel.fgov.be", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Belize", region: "Americas", organization: "Statistical Institute of Belize", url: "http://www.statisticsbelize.org.bz", currentStatus: "down", uptimeHistory: [0,0,1,1,0,0,1,0,0,1,0,0] },
  { country: "Benin", region: "Africa", organization: "Institut National de la Statistique", url: "https://instad.bj", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Bhutan", region: "Asia", organization: "National Statistics Bureau", url: "https://www.nsb.gov.bt", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Bolivia", region: "Americas", organization: "Instituto Nacional de Estadística", url: "https://www.ine.gob.bo", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Bosnia and Herzegovina", region: "Europe", organization: "Agency for Statistics", url: "http://www.bhas.ba", currentStatus: "up", uptimeHistory: [1,1,1,1,0,1,1,1,1,1,1,1] },
  { country: "Botswana", region: "Africa", organization: "Statistics Botswana", url: "https://www.statsbots.org.bw", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Brazil", region: "Americas", organization: "Instituto Brasileiro de Geografia e Estatística", url: "https://www.ibge.gov.br", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Brunei", region: "Asia", organization: "Department of Economic Planning", url: "http://www.deps.gov.bn", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,0,1,1,1,1] },
  { country: "Bulgaria", region: "Europe", organization: "National Statistical Institute", url: "https://www.nsi.bg", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Burkina Faso", region: "Africa", organization: "Institut National de la Statistique", url: "http://www.insd.bf", currentStatus: "down", uptimeHistory: [0,1,1,0,0,1,0,0,0,1,0,0] },
  { country: "Burundi", region: "Africa", organization: "Institut de Statistiques", url: "https://www.isteebu.bi", currentStatus: "up", uptimeHistory: [1,1,0,1,1,1,1,1,1,1,1,1] },
  { country: "Cambodia", region: "Asia", organization: "National Institute of Statistics", url: "https://www.nis.gov.kh", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Cameroon", region: "Africa", organization: "Institut National de la Statistique", url: "http://www.statistics-cameroon.org", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Canada", region: "Americas", organization: "Statistics Canada", url: "https://www.statcan.gc.ca", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Central African Republic", region: "Africa", organization: "Institut Centrafricain des Statistiques", url: "http://www.icasees.org", currentStatus: "down", uptimeHistory: [0,0,0,0,1,0,0,0,0,0,0,0] },
  { country: "Chad", region: "Africa", organization: "Institut National de la Statistique", url: "https://www.inseed.td", currentStatus: "up", uptimeHistory: [1,1,1,1,1,0,1,1,1,1,1,1] },
  { country: "Chile", region: "Americas", organization: "Instituto Nacional de Estadísticas", url: "https://www.ine.cl", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "China", region: "Asia", organization: "National Bureau of Statistics", url: "http://www.stats.gov.cn", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Colombia", region: "Americas", organization: "DANE", url: "https://www.dane.gov.co", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Comoros", region: "Africa", organization: "Direction Nationale de la Statistique", url: "http://www.inseed.km", currentStatus: "unknown", uptimeHistory: [null,null,1,1,null,null,1,null,null,null,1,null] },
  { country: "Congo, Dem. Rep.", region: "Africa", organization: "Institut National de la Statistique", url: "https://www.ins.cd", currentStatus: "down", uptimeHistory: [0,0,0,1,0,0,0,0,0,0,1,0] },
  { country: "Congo, Rep.", region: "Africa", organization: "Institut National de la Statistique", url: "http://www.ins-congo.org", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Costa Rica", region: "Americas", organization: "Instituto Nacional de Estadística", url: "https://www.inec.cr", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Côte d'Ivoire", region: "Africa", organization: "Institut National de la Statistique", url: "http://www.ins.ci", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Croatia", region: "Europe", organization: "Croatian Bureau of Statistics", url: "https://www.dzs.hr", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Cuba", region: "Americas", organization: "Oficina Nacional de Estadística", url: "http://www.onei.gob.cu", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,0,1,1,1,1,1] },
  { country: "Cyprus", region: "Europe", organization: "Statistical Service of Cyprus", url: "https://www.cystat.gov.cy", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Czech Republic", region: "Europe", organization: "Czech Statistical Office", url: "https://www.czso.cz", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Denmark", region: "Europe", organization: "Statistics Denmark", url: "https://www.dst.dk", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Djibouti", region: "Africa", organization: "Direction de la Statistique", url: "http://www.instad.dj", currentStatus: "down", uptimeHistory: [0,0,0,0,0,0,1,0,0,0,0,0] },
  { country: "Dominican Republic", region: "Americas", organization: "Oficina Nacional de Estadística", url: "https://www.one.gob.do", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Ecuador", region: "Americas", organization: "Instituto Nacional de Estadística", url: "https://www.ecuadorencifras.gob.ec", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Egypt", region: "Africa", organization: "CAPMAS", url: "https://www.capmas.gov.eg", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "El Salvador", region: "Americas", organization: "DIGESTYC", url: "http://www.digestyc.gob.sv", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Eritrea", region: "Africa", organization: "National Statistics Office", url: "http://www.nsoe.gov.er", currentStatus: "down", uptimeHistory: [0,0,0,0,0,0,0,0,0,0,0,0] },
  { country: "Estonia", region: "Europe", organization: "Statistics Estonia", url: "https://www.stat.ee", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Eswatini", region: "Africa", organization: "Central Statistical Office", url: "http://www.swazistats.org.sz", currentStatus: "up", uptimeHistory: [1,1,1,0,1,1,1,1,1,1,1,1] },
  { country: "Ethiopia", region: "Africa", organization: "Central Statistical Agency", url: "https://www.statsethiopia.gov.et", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Fiji", region: "Oceania", organization: "Bureau of Statistics", url: "https://www.statsfiji.gov.fj", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Finland", region: "Europe", organization: "Statistics Finland", url: "https://www.stat.fi", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "France", region: "Europe", organization: "INSEE", url: "https://www.insee.fr", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Gabon", region: "Africa", organization: "Direction Générale de la Statistique", url: "https://www.stat-gabon.org", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,0,1,1,1,1] },
  { country: "Gambia", region: "Africa", organization: "Gambia Bureau of Statistics", url: "https://www.gbosdata.org", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Georgia", region: "Asia", organization: "National Statistics Office", url: "https://www.geostat.ge", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Germany", region: "Europe", organization: "Federal Statistical Office", url: "https://www.destatis.de", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Ghana", region: "Africa", organization: "Ghana Statistical Service", url: "https://www.statsghana.gov.gh", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Greece", region: "Europe", organization: "Hellenic Statistical Authority", url: "https://www.statistics.gr", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Guatemala", region: "Americas", organization: "Instituto Nacional de Estadística", url: "https://www.ine.gob.gt", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Guinea", region: "Africa", organization: "Institut National de la Statistique", url: "http://www.stat-guinee.org", currentStatus: "down", uptimeHistory: [1,0,0,0,0,1,0,0,0,0,0,0] },
  { country: "Guinea-Bissau", region: "Africa", organization: "Instituto Nacional de Estatística", url: "http://www.stat-guinebissau.com", currentStatus: "down", uptimeHistory: [0,0,0,0,0,0,0,0,0,0,0,0] },
  { country: "Guyana", region: "Americas", organization: "Bureau of Statistics", url: "https://statisticsguyana.gov.gy", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Haiti", region: "Americas", organization: "Institut Haïtien de Statistique", url: "http://www.ihsi.ht", currentStatus: "down", uptimeHistory: [0,1,0,0,0,1,0,0,0,0,1,0] },
  { country: "Honduras", region: "Americas", organization: "Instituto Nacional de Estadística", url: "https://www.ine.gob.hn", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Hungary", region: "Europe", organization: "Hungarian Central Statistical Office", url: "https://www.ksh.hu", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Iceland", region: "Europe", organization: "Statistics Iceland", url: "https://www.statice.is", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "India", region: "Asia", organization: "Ministry of Statistics", url: "https://www.mospi.gov.in", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Indonesia", region: "Asia", organization: "Statistics Indonesia", url: "https://www.bps.go.id", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Iran", region: "Asia", organization: "Statistical Centre of Iran", url: "https://www.amar.org.ir", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Iraq", region: "Asia", organization: "Central Statistical Organization", url: "http://www.cosit.gov.iq", currentStatus: "up", uptimeHistory: [1,1,1,1,0,1,1,1,1,1,1,1] },
  { country: "Ireland", region: "Europe", organization: "Central Statistics Office", url: "https://www.cso.ie", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Israel", region: "Asia", organization: "Central Bureau of Statistics", url: "https://www.cbs.gov.il", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Italy", region: "Europe", organization: "ISTAT", url: "https://www.istat.it", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Jamaica", region: "Americas", organization: "Statistical Institute of Jamaica", url: "https://statinja.gov.jm", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Japan", region: "Asia", organization: "Statistics Bureau", url: "https://www.stat.go.jp", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Jordan", region: "Asia", organization: "Department of Statistics", url: "http://www.dos.gov.jo", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Kazakhstan", region: "Asia", organization: "Bureau of National Statistics", url: "https://stat.gov.kz", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Kenya", region: "Africa", organization: "Kenya National Bureau of Statistics", url: "https://www.knbs.or.ke", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Korea, South", region: "Asia", organization: "Statistics Korea", url: "http://kostat.go.kr", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Kuwait", region: "Asia", organization: "Central Statistical Bureau", url: "https://www.csb.gov.kw", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Kyrgyzstan", region: "Asia", organization: "National Statistical Committee", url: "http://www.stat.kg", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Laos", region: "Asia", organization: "Lao Statistics Bureau", url: "https://www.lsb.gov.la", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,0,1,1,1,1] },
  { country: "Latvia", region: "Europe", organization: "Central Statistical Bureau", url: "https://www.csp.gov.lv", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Lebanon", region: "Asia", organization: "Central Administration of Statistics", url: "http://www.cas.gov.lb", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,0,1,1,1] },
  { country: "Lesotho", region: "Africa", organization: "Bureau of Statistics", url: "https://www.bos.gov.ls", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Liberia", region: "Africa", organization: "Liberia Institute of Statistics", url: "https://www.lisgis.net", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Libya", region: "Africa", organization: "Bureau of Statistics", url: "https://bsc.ly", currentStatus: "down", uptimeHistory: [0,0,0,0,1,0,0,0,0,0,0,0] },
  { country: "Lithuania", region: "Europe", organization: "Statistics Lithuania", url: "https://www.stat.gov.lt", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Luxembourg", region: "Europe", organization: "STATEC", url: "https://statistiques.public.lu", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Madagascar", region: "Africa", organization: "Institut National de la Statistique", url: "https://www.instat.mg", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Malawi", region: "Africa", organization: "National Statistical Office", url: "http://www.nsomalawi.mw", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,0,1,1] },
  { country: "Malaysia", region: "Asia", organization: "Department of Statistics", url: "https://www.dosm.gov.my", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Maldives", region: "Asia", organization: "National Bureau of Statistics", url: "http://statisticsmaldives.gov.mv", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Mali", region: "Africa", organization: "Institut National de la Statistique", url: "http://www.instat-mali.org", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Malta", region: "Europe", organization: "National Statistics Office", url: "https://nso.gov.mt", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Mauritania", region: "Africa", organization: "Office National de la Statistique", url: "http://www.ons.mr", currentStatus: "up", uptimeHistory: [1,1,1,1,1,0,1,1,1,1,1,1] },
  { country: "Mauritius", region: "Africa", organization: "Statistics Mauritius", url: "https://statsmauritius.govmu.org", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Mexico", region: "Americas", organization: "INEGI", url: "https://www.inegi.org.mx", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Moldova", region: "Europe", organization: "National Bureau of Statistics", url: "https://www.statistica.md", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Mongolia", region: "Asia", organization: "National Statistics Office", url: "https://www.1212.mn", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Montenegro", region: "Europe", organization: "Statistical Office", url: "https://www.monstat.org", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Morocco", region: "Africa", organization: "Haut-Commissariat au Plan", url: "https://www.hcp.ma", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Mozambique", region: "Africa", organization: "Instituto Nacional de Estatística", url: "http://www.ine.gov.mz", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Myanmar", region: "Asia", organization: "Central Statistical Organization", url: "https://www.csostat.gov.mm", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,0,1,1] },
  { country: "Namibia", region: "Africa", organization: "Namibia Statistics Agency", url: "https://nsa.nsa.org.na", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Nepal", region: "Asia", organization: "Central Bureau of Statistics", url: "https://cbs.gov.np", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Netherlands", region: "Europe", organization: "Statistics Netherlands", url: "https://www.cbs.nl", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "New Zealand", region: "Oceania", organization: "Stats NZ", url: "https://www.stats.govt.nz", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Nicaragua", region: "Americas", organization: "INIDE", url: "https://www.inide.gob.ni", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Niger", region: "Africa", organization: "Institut National de la Statistique", url: "http://www.stat-niger.org", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,0,1,1,1,1] },
  { country: "Nigeria", region: "Africa", organization: "National Bureau of Statistics", url: "https://www.nigerianstat.gov.ng", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "North Macedonia", region: "Europe", organization: "State Statistical Office", url: "https://www.stat.gov.mk", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Norway", region: "Europe", organization: "Statistics Norway", url: "https://www.ssb.no", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Oman", region: "Asia", organization: "National Centre for Statistics", url: "https://www.ncsi.gov.om", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Pakistan", region: "Asia", organization: "Pakistan Bureau of Statistics", url: "https://www.pbs.gov.pk", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Panama", region: "Americas", organization: "Instituto Nacional de Estadística", url: "https://www.inec.gob.pa", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Papua New Guinea", region: "Oceania", organization: "National Statistical Office", url: "https://www.nso.gov.pg", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,0,1,1,1,1,1] },
  { country: "Paraguay", region: "Americas", organization: "DGEEC", url: "https://www.dgeec.gov.py", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Peru", region: "Americas", organization: "Instituto Nacional de Estadística", url: "https://www.inei.gob.pe", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Philippines", region: "Asia", organization: "Philippine Statistics Authority", url: "https://psa.gov.ph", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Poland", region: "Europe", organization: "Statistics Poland", url: "https://stat.gov.pl", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Portugal", region: "Europe", organization: "Statistics Portugal", url: "https://www.ine.pt", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Qatar", region: "Asia", organization: "Planning and Statistics Authority", url: "https://www.psa.gov.qa", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Romania", region: "Europe", organization: "National Institute of Statistics", url: "https://www.insse.ro", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Russia", region: "Europe", organization: "Federal State Statistics Service", url: "https://rosstat.gov.ru", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Rwanda", region: "Africa", organization: "National Institute of Statistics", url: "https://www.statistics.gov.rw", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Saudi Arabia", region: "Asia", organization: "General Authority for Statistics", url: "https://www.stats.gov.sa", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Senegal", region: "Africa", organization: "Agence Nationale de la Statistique", url: "https://www.ansd.sn", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Serbia", region: "Europe", organization: "Statistical Office", url: "https://www.stat.gov.rs", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Sierra Leone", region: "Africa", organization: "Statistics Sierra Leone", url: "https://www.statistics.sl", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Singapore", region: "Asia", organization: "Department of Statistics", url: "https://www.singstat.gov.sg", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Slovakia", region: "Europe", organization: "Statistical Office", url: "https://www.statistics.sk", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Slovenia", region: "Europe", organization: "Statistical Office", url: "https://www.stat.si", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Somalia", region: "Africa", organization: "National Bureau of Statistics", url: "https://nbs.gov.so", currentStatus: "up", uptimeHistory: [1,1,0,1,1,1,1,1,1,1,1,1] },
  { country: "South Africa", region: "Africa", organization: "Statistics South Africa", url: "https://www.statssa.gov.za", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "South Sudan", region: "Africa", organization: "National Bureau of Statistics", url: "https://www.ssnbss.org", currentStatus: "down", uptimeHistory: [0,0,0,0,0,0,0,1,0,0,0,0] },
  { country: "Spain", region: "Europe", organization: "Instituto Nacional de Estadística", url: "https://www.ine.es", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Sri Lanka", region: "Asia", organization: "Department of Census and Statistics", url: "http://www.statistics.gov.lk", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Sudan", region: "Africa", organization: "Central Bureau of Statistics", url: "http://www.cbs.gov.sd", currentStatus: "down", uptimeHistory: [0,0,1,0,0,0,0,0,1,0,0,0] },
  { country: "Suriname", region: "Americas", organization: "General Bureau of Statistics", url: "https://statistics-suriname.org", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Sweden", region: "Europe", organization: "Statistics Sweden", url: "https://www.scb.se", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Switzerland", region: "Europe", organization: "Federal Statistical Office", url: "https://www.bfs.admin.ch", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Syria", region: "Asia", organization: "Central Bureau of Statistics", url: "http://cbssyr.sy", currentStatus: "down", uptimeHistory: [0,0,0,0,0,1,0,0,0,0,0,0] },
  { country: "Taiwan", region: "Asia", organization: "Directorate-General of Budget", url: "https://www.stat.gov.tw", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Tajikistan", region: "Asia", organization: "Agency on Statistics", url: "https://www.stat.tj", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Tanzania", region: "Africa", organization: "National Bureau of Statistics", url: "https://www.nbs.go.tz", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Thailand", region: "Asia", organization: "National Statistical Office", url: "http://www.nso.go.th", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Timor-Leste", region: "Asia", organization: "General Directorate of Statistics", url: "https://www.statistics.gov.tl", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,0,1,1,1] },
  { country: "Togo", region: "Africa", organization: "Institut National de la Statistique", url: "https://inseed.tg", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Trinidad and Tobago", region: "Americas", organization: "Central Statistical Office", url: "https://cso.gov.tt", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Tunisia", region: "Africa", organization: "Institut National de la Statistique", url: "http://www.ins.tn", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Turkey", region: "Asia", organization: "Turkish Statistical Institute", url: "https://www.tuik.gov.tr", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Turkmenistan", region: "Asia", organization: "State Committee of Statistics", url: "https://www.stat.gov.tm", currentStatus: "up", uptimeHistory: [1,1,1,1,1,0,1,1,1,1,1,1] },
  { country: "Uganda", region: "Africa", organization: "Uganda Bureau of Statistics", url: "https://www.ubos.org", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Ukraine", region: "Europe", organization: "State Statistics Service", url: "https://www.ukrstat.gov.ua", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "United Arab Emirates", region: "Asia", organization: "Federal Competitiveness and Statistics Centre", url: "https://fcsc.gov.ae", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "United Kingdom", region: "Europe", organization: "Office for National Statistics", url: "https://www.ons.gov.uk", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "United States", region: "Americas", organization: "U.S. Census Bureau", url: "https://www.census.gov", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Uruguay", region: "Americas", organization: "Instituto Nacional de Estadística", url: "https://www.ine.gub.uy", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Uzbekistan", region: "Asia", organization: "State Committee on Statistics", url: "https://www.stat.uz", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Venezuela", region: "Americas", organization: "Instituto Nacional de Estadística", url: "http://www.ine.gov.ve", currentStatus: "up", uptimeHistory: [1,1,0,1,1,1,1,1,1,1,1,1] },
  { country: "Vietnam", region: "Asia", organization: "General Statistics Office", url: "https://www.gso.gov.vn", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Yemen", region: "Asia", organization: "Central Statistical Organization", url: "http://www.cso-yemen.org", currentStatus: "down", uptimeHistory: [0,0,0,0,0,0,0,0,0,0,0,0] },
  { country: "Zambia", region: "Africa", organization: "Zambia Statistics Agency", url: "https://www.zamstats.gov.zm", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
  { country: "Zimbabwe", region: "Africa", organization: "ZIMSTAT", url: "https://www.zimstat.co.zw", currentStatus: "up", uptimeHistory: [1,1,1,1,1,1,1,1,1,1,1,1] },
];

// Helper functions
const calculateUptime = (history) => {
  const validChecks = history.filter(h => h !== null);
  if (validChecks.length === 0) return null;
  return (validChecks.filter(h => h === 1).length / validChecks.length) * 100;
};

const getStatusColor = (status) => {
  switch(status) {
    case 'up': return '#10b981';
    case 'down': return '#ef4444';
    default: return '#6b7280';
  }
};

const getUptimeColor = (uptime) => {
  if (uptime === null) return '#6b7280';
  if (uptime >= 99) return '#10b981';
  if (uptime >= 95) return '#22c55e';
  if (uptime >= 90) return '#84cc16';
  if (uptime >= 75) return '#eab308';
  if (uptime >= 50) return '#f97316';
  return '#ef4444';
};

const StatusIndicator = ({ status }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }}>
    <div style={{
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      backgroundColor: getStatusColor(status),
      boxShadow: status === 'up' ? '0 0 8px #10b981' : status === 'down' ? '0 0 8px #ef4444' : 'none',
    }} />
    <span style={{
      fontSize: '12px',
      fontWeight: '500',
      color: getStatusColor(status),
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    }}>
      {status}
    </span>
  </div>
);

const UptimeBar = ({ history }) => {
  const weeks = ['12w', '11w', '10w', '9w', '8w', '7w', '6w', '5w', '4w', '3w', '2w', '1w'];
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
      {history.map((status, i) => (
        <div
          key={i}
          title={`${weeks[i]} ago: ${status === 1 ? 'Up' : status === 0 ? 'Down' : 'Unknown'}`}
          style={{
            width: '6px',
            height: '20px',
            borderRadius: '2px',
            backgroundColor: status === 1 ? '#10b981' : status === 0 ? '#ef4444' : '#374151',
            opacity: status === null ? 0.3 : 1,
          }}
        />
      ))}
    </div>
  );
};

export default function NSOUptimeMonitor() {
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('country');
  const [sortOrder, setSortOrder] = useState('asc');

  const regions = [...new Set(sampleNSOData.map(d => d.region))].sort();
  
  const filteredData = useMemo(() => {
    return sampleNSOData
      .filter(nso => {
        const matchesSearch = nso.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             nso.organization.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRegion = regionFilter === 'all' || nso.region === regionFilter;
        const matchesStatus = statusFilter === 'all' || nso.currentStatus === statusFilter;
        return matchesSearch && matchesRegion && matchesStatus;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch(sortBy) {
          case 'country':
            comparison = a.country.localeCompare(b.country);
            break;
          case 'status':
            const statusOrder = { up: 0, unknown: 1, down: 2 };
            comparison = statusOrder[a.currentStatus] - statusOrder[b.currentStatus];
            break;
          case 'uptime':
            comparison = (calculateUptime(b.uptimeHistory) || 0) - (calculateUptime(a.uptimeHistory) || 0);
            break;
          default:
            comparison = 0;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [searchTerm, regionFilter, statusFilter, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const total = sampleNSOData.length;
    const up = sampleNSOData.filter(n => n.currentStatus === 'up').length;
    const down = sampleNSOData.filter(n => n.currentStatus === 'down').length;
    const unknown = sampleNSOData.filter(n => n.currentStatus === 'unknown').length;
    const avgUptime = sampleNSOData.reduce((acc, n) => acc + (calculateUptime(n.uptimeHistory) || 0), 0) / total;
    return { total, up, down, unknown, avgUptime };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#e2e8f0',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderBottom: '1px solid #334155',
        padding: '24px 32px',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 12px #10b981',
              animation: 'pulse 2s infinite',
            }} />
            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#f8fafc',
              margin: 0,
              letterSpacing: '-0.5px',
            }}>
              NSO Uptime Monitor
            </h1>
          </div>
          <p style={{
            fontSize: '14px',
            color: '#94a3b8',
            margin: 0,
          }}>
            Monitoring {stats.total} National Statistical Office websites worldwide
          </p>
        </div>
      </header>

      {/* Stats Bar */}
      <div style={{
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '16px 32px',
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          gap: '32px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>OPERATIONAL</span>
            <span style={{ color: '#10b981', fontWeight: '600', fontSize: '18px' }}>{stats.up}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>DOWN</span>
            <span style={{ color: '#ef4444', fontWeight: '600', fontSize: '18px' }}>{stats.down}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>UNKNOWN</span>
            <span style={{ color: '#6b7280', fontWeight: '600', fontSize: '18px' }}>{stats.unknown}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>AVG UPTIME (12w)</span>
            <span style={{ 
              color: getUptimeColor(stats.avgUptime), 
              fontWeight: '600', 
              fontSize: '18px' 
            }}>
              {stats.avgUptime.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '16px 32px',
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <input
            type="text"
            placeholder="Search countries or organizations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '10px 14px',
              color: '#e2e8f0',
              fontSize: '14px',
              width: '280px',
              outline: 'none',
            }}
          />
          
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '10px 14px',
              color: '#e2e8f0',
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Regions</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '10px 14px',
              color: '#e2e8f0',
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Status</option>
            <option value="up">Operational</option>
            <option value="down">Down</option>
            <option value="unknown">Unknown</option>
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '10px 14px',
              color: '#e2e8f0',
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="country-asc">Country A-Z</option>
            <option value="country-desc">Country Z-A</option>
            <option value="uptime-desc">Uptime High-Low</option>
            <option value="uptime-asc">Uptime Low-High</option>
            <option value="status-asc">Status (Up first)</option>
            <option value="status-desc">Status (Down first)</option>
          </select>

          <span style={{ 
            marginLeft: 'auto', 
            color: '#64748b', 
            fontSize: '13px' 
          }}>
            Showing {filteredData.length} of {stats.total}
          </span>
        </div>
      </div>

      {/* Table */}
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px 32px',
      }}>
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          border: '1px solid #334155',
          overflow: 'hidden',
        }}>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '180px 1fr 80px 180px 100px',
            gap: '16px',
            padding: '14px 20px',
            backgroundColor: '#0f172a',
            borderBottom: '1px solid #334155',
            fontSize: '11px',
            fontWeight: '600',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            <div>Country</div>
            <div>Organization</div>
            <div>Status</div>
            <div>12-Week History</div>
            <div style={{ textAlign: 'right' }}>Uptime</div>
          </div>

          {/* Table Rows */}
          {filteredData.map((nso, idx) => {
            const uptime = calculateUptime(nso.uptimeHistory);
            return (
              <div
                key={nso.country}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '180px 1fr 80px 180px 100px',
                  gap: '16px',
                  padding: '14px 20px',
                  borderBottom: idx < filteredData.length - 1 ? '1px solid #334155' : 'none',
                  backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(15, 23, 42, 0.3)',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'rgba(15, 23, 42, 0.3)'}
              >
                <div style={{ 
                  fontWeight: '500', 
                  color: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  {nso.country}
                </div>
                <div style={{ 
                  color: '#94a3b8',
                  fontSize: '13px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}>
                  <span>{nso.organization}</span>
                  <a
                    href={nso.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#60a5fa',
                      fontSize: '11px',
                      textDecoration: 'none',
                      opacity: 0.8,
                    }}
                  >
                    {nso.url.replace(/^https?:\/\//, '').split('/')[0]}
                  </a>
                </div>
                <div>
                  <StatusIndicator status={nso.currentStatus} />
                </div>
                <div>
                  <UptimeBar history={nso.uptimeHistory} />
                </div>
                <div style={{ 
                  textAlign: 'right',
                  fontWeight: '600',
                  color: getUptimeColor(uptime),
                  fontSize: '14px',
                }}>
                  {uptime !== null ? `${uptime.toFixed(1)}%` : '—'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          border: '1px solid #334155',
          fontSize: '12px',
          color: '#64748b',
        }}>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong style={{ color: '#94a3b8' }}>About this monitor:</strong> This dashboard tracks website availability for National Statistical Offices worldwide.
          </p>
          <p style={{ margin: 0 }}>
            Each bar in the history represents one week. Green = operational, Red = down, Gray = unknown/not checked.
            Data source: <a href="https://opendatawatch.com" style={{ color: '#60a5fa' }}>Open Data Watch</a>
          </p>
        </div>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}
