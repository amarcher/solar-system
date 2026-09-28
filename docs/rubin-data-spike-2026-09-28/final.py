import pandas as pd, numpy as np, json, re
pd.set_option('display.width',250); pd.set_option('display.max_columns',40)
x=pd.read_parquet('x05_objects.parquet'); a=pd.read_parquet('sbdb_asteroids.parquet'); cm=pd.read_parquet('sbdb_comets.parquet').rename(columns={'M1':'H'})
sb=pd.concat([a,cm],ignore_index=True)
x['key']=x.permid.fillna(x.provid)
x['key']=x.key.str.replace(r'^[CPDXAI]/','',regex=True)
j=x.merge(sb,left_on='key',right_on='pdes',how='left')
iscom=j.kind.astype(str).str.startswith('c')
hil=(j['class']=='OMB')&j.a.between(3.7,4.2)&(j.e<0.3)&(j.i<20)
M={'IEO':'NEO Atira','ATE':'NEO Aten','APO':'NEO Apollo','AMO':'NEO Amor','MCA':'Mars-crosser','IMB':'inner main belt','MBA':'main belt','OMB':'outer main belt','TJN':'Jupiter Trojan','CEN':'Centaur','TNO':'TNO','PAA':'parabolic asteroid','HYA':'hyperbolic asteroid','AST':'other asteroid'}
j['group']=j['class'].map(M)
j.loc[hil,'group']='Hilda (3:2 w/ Jupiter)'
j.loc[iscom,'group']='comet ('+j.loc[iscom,'class'].astype(str)+')'
j.loc[j['class'].isna(),'group']='no SBDB match (linked to older desig)'
# Rubin-credited new discovery: disc flag, and Rubin provid is the principal designation
prim=j.apply(lambda r: isinstance(r.provid,str) and isinstance(r.full_name,str) and (r.pdes==r.provid or ('('+r.provid+')') in r.full_name.replace('  ',' ')) ,axis=1)
j['rubin_new']=(j.x05_disc==1)&prim
# comets: P/2026 N2 principal
j.loc[(j.key=='2026 N2'),'rubin_new']=j.loc[(j.key=='2026 N2'),'x05_disc']==1
# diameter estimate
alb=np.select([j['class'].isin(['TNO']),j['class'].isin(['TJN','CEN'])|hil|iscom],[0.10,0.07],0.15)
j['D_est_km']=np.where(j.diameter.notna(),j.diameter,1329/np.sqrt(alb)*10**(-j.H/5))
j.to_parquet('x05_join_sbdb.parquet')
N=j[j.rubin_new]
tab=pd.DataFrame({'X05_observed':j.group.value_counts(),'X05_disc_flag':j[j.x05_disc==1].group.value_counts(),'Rubin_new_principal':N.group.value_counts()}).fillna(0).astype(int).sort_values('X05_observed',ascending=False)
for lab,m in [('NEO total',j.neo=='Y'),('PHA',j.pha=='Y'),('retrograde i>90',j.i>90)]:
    tab.loc[lab]=[m.sum(),(m&(j.x05_disc==1)).sum(),(m&j.rubin_new).sum()]
tab.loc['TOTAL']=[len(j),(j.x05_disc==1).sum(),j.rubin_new.sum()]
print(tab.to_string()); tab.to_csv('class_breakdown_mpc_x05.csv')
# orbit quality of Rubin-new
cc=pd.to_numeric(N.condition_code,errors='coerce')
print('\nRubin-new condition_code distribution'); print(cc.value_counts().sort_index().to_string())
print('arc>=30d',(N.data_arc>=30).sum(),'arc>=90d',(N.data_arc>=90).sum(),'cc<=5',(cc<=5).sum(),'cc<=3',(cc<=3).sum(), 'numbered', N.permid.notna().sum())
q=N.groupby('group').apply(lambda g: pd.Series({'n':len(g),'cc<=5':(pd.to_numeric(g.condition_code,errors='coerce')<=5).sum(),'median_arc_d':g.data_arc.median()}))
print(q.to_string()); q.to_csv('rubin_new_orbit_quality_by_class.csv')
# discoveries by month (disc obs date) for Rubin-new
import duckdb
dm=duckdb.sql("select provid, min(obstime) t from 'x05_obs_slim.parquet' where disc='*' group by 1").df()
dm=dm[dm.provid.isin(N.provid)]
bym=dm.t.dt.strftime('%Y-%m').value_counts().sort_index(); print(bym.to_string()); bym.to_csv('rubin_new_discoveries_by_month.csv')
N.merge(dm,on='provid',how='left').drop(columns=['kind','prefix']).to_csv('rubin_new_discoveries.csv',index=False)
# CAD
c=json.load(open('cad.json')); cad=pd.DataFrame(c['data'],columns=c['fields']); cad['dist']=cad.dist.astype(float); cad['LD']=cad.dist/0.00256955529
cad['des']=cad.des.str.strip()
cj=cad.merge(j[['key','group','rubin_new','H','D_est_km','pha','nobs']],left_on='des',right_on='key')
cj=cj.sort_values('cd'); cj.to_csv('x05_neo_close_approaches_2026-2036.csv',index=False)
print('\nX05-observed NEOs with Earth approaches <0.2 au through 2036:',cj.des.nunique(),' within 10 LD:',cj[cj.LD<10].des.nunique())
print(cj[cj.LD<20][['des','cd','LD','v_rel','H','D_est_km','rubin_new','pha']].head(40).to_string())
# Sentry
s=json.load(open('sentry.json')); sn=pd.DataFrame(s['data']); sn['des']=sn.des.str.strip()
sj=sn.merge(j[['key','group','rubin_new','nobs','H']],left_on='des',right_on='key')
sj.to_csv('x05_sentry_objects.csv',index=False)
print('\nSentry objects observed by X05:',len(sj)); print(sj[['des','range','ip','ps_cum','ts_max','diameter','h','rubin_new','nobs']].sort_values('ps_cum',key=lambda s:-s.astype(float)).to_string())
