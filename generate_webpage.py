from datetime import timedelta, date
from data.transform_addData import transform_dat
import pandas as pd
from tools import strip_accents
import numpy as np


def write_json_graph(filepath, const_data, activeCases_dist, UTI_dist, cumDeath_dist, FOI_dist, duration_all, start_date_, end_date):

	# JSON filegeneration

	# General Info
	datacovid = []
	listNames = [name for name in const_data["Name"]]
	cods =  [code for code in const_data["Code"]]
	nVertices = len(listNames)
	y = [lon for lon in const_data["long"]]
	x = [lat for lat in const_data["lat"]]
	demo_dens = [dens for dens in const_data['densidade demografica 2019 (hab/km2)']]
	water_supply = [water for water in const_data['(mean) Percentual de pessoas em domicílios com abastecimento de água e esgotamento sanitário inadequados']]
	population_2019 = [pop for pop in const_data["population_2019"]]

	# socioeconomic dict
	dist_vars,vars_dict = get_additionalVariables(listNames)

	for i in range(nVertices):

		temp_dict = dict([])

		temp_dict["name"] = listNames[i]
		temp_dict["bairro_codigo"] = cods[i]
		temp_dict["long"] = x[i]
		temp_dict["lat"] = y[i]
		temp_dict["population_2019"] = int(population_2019[i])
		temp_dict["demo_dens"] = demo_dens[i] 
		temp_dict["water_supply"] = water_supply[i]
		temp_dict["duration_samples"] = duration_all[listNames[i]]


		#activecases over time
		delta = timedelta(days = 1)
		start_date = start_date_
		line_activeCases = []
		line_UTI = []
		line_cumDeath = []
		line_est_activeCases = []
		line_FOI = []
		while start_date < end_date:
			#print(strip_accents(name).upper()+str(start_date))
			value = 0
			value = activeCases_dist[listNames[i]+str(start_date)]
			line_activeCases.append([str(start_date) ,int(value)])
			line_est_activeCases.append([str(start_date), int(value/0.2)])
			value = UTI_dist[listNames[i]+str(start_date)]
			line_UTI.append([str(start_date) ,int(value)])
			value = cumDeath_dist[listNames[i]+str(start_date)]
			line_cumDeath.append([str(start_date) ,int(value)])
			line_FOI.append([str(start_date) ,float(FOI_dist[listNames[i]+str(start_date)])])
			start_date += delta
		temp_dict['active_cases'] = line_activeCases
		temp_dict['active_uti_cases'] = line_UTI
		temp_dict['cum_deaths'] = line_cumDeath
		temp_dict['est_active_cases'] = line_est_activeCases
		temp_dict['foi_sing'] = line_FOI

		# add socioeconomic features
		'''
		for var in vars_dict.keys():
			vals = dist_vars[listNames[i]+str(var)]
			line_Add = []
			if(len(vals)>0):
				temp_dict["(min) " + vars_dict[var]] = float(min(vals))
				temp_dict["(max) " + vars_dict[var]] = float(max(vals))
				temp_dict["(mean) " + vars_dict[var]] = float(mean(vals))
			else:
				temp_dict["(min) " + vars_dict[var]] = float(0)
				temp_dict["(max) " + vars_dict[var]] = float(0)
				temp_dict["(mean) " + vars_dict[var]] = float(0)

		'''
		var = vars_dict.keys()
		triggers = [4, 9, 32, 39, 44, 48, 53, 65, 74, 103, 109, 115, 129, 144, 162, 180, 184, 204, 211]
		v = 0
		while v < len(vars_dict.keys()):
			if(not(v in triggers)):
				vals = dist_vars[listNames[i]+str(v)]
				vals_dictionary = dict([])
				if(len(vals)>0):
					vals_dictionary['min'] = float(np.min(vals))
					vals_dictionary['max'] = float(np.max(vals))
					vals_dictionary['mean'] = float(np.mean(vals))				
				else:
					vals_dictionary['min'] = float(0)
					vals_dictionary['max'] = float(0)
					vals_dictionary['mean'] = float(0)	
				temp_dict[vars_dict[v]] = vals_dictionary
				v += 1
			else: # nested variables...
				v, var_name, var_dict = transform_dat(vars_dict, dist_vars, listNames[i], v)
				temp_dict[var_name] = var_dict

		# append to datacovid
		datacovid.append(temp_dict)

	# write the graph
	datacovid = "let bairros = " + str(datacovid)
	filehandle = open(filepath, 'w')
	filehandle.write(datacovid)

def get_additionalVariables(district_list):
	# get variable dict for each district
	DB = pd.ExcelFile("data/suplement_inputs/A - DICIONÁRIO dos indicadores do Atlas.xlsx")
	DB = DB.parse("Plan1") #choose a sheet and parse it...
	col_dict = dict([])
	for i in range(20,247):
		col_dict[i-20] = DB.iloc[i, 0]
	dist_var = dict([])
	#initialize dicts
	for dist in district_list:
		for var in col_dict.keys():
			dist_var[dist+str(var)] = []
	DB = pd.ExcelFile("data/suplement_inputs/RM 62600 Recife - Base UDH 2000_2010.xlsx")
	DB = DB.parse("Sheet1") #choose a sheet and parse it...
	#udh = DB.groupby(['Bairro', 'ANO', 'NOME_MUN'])
	#initialize dicts
	#for i in district_list
	for i in range(len(DB)):
		if(DB.iloc[i,11] == 2010): # if the year is 2010
			city_i = DB.iloc[i,6]
			if city_i == 'Recife': # if is a district
				dists_i = DB.iloc[i,3].split("/")
				cnt = 0
				for dist in dists_i: #loop over all districts
					cnt += 1
					clean_dist = dist
					if(cnt == len(dists_i)):
						if(dist[len(dist)-1] == " "):
							clean_dist = dist[0:len(dist)-1]
					for var in col_dict.keys():
						val_tempp = DB.iloc[i,var+12]
						if np.isnan(val_tempp):
							val_tempp = 0
						val_ = dist_var[strip_accents(clean_dist).upper()+str(var)] + [val_tempp]

						dist_var[strip_accents(clean_dist).upper()+str(var)] = val_
	return dist_var,col_dict