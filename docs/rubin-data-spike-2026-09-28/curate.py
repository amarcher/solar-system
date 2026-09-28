import pandas as pd, numpy as np, json
j=pd.read_parquet('x05_join_sbdb.parquet')
cmt=pd.read_parquet('sbdb_comets.parquet').rename(columns={'M1':'H'}); r3=cmt[cmt.pdes=='2025 N1'].copy()
r3['key']='2025 N1'; r3['group']='interstellar comet (HYP)'; r3['rubin_new']=False; r3['nobs']=9; r3['D_est_km']=np.nan; r3['x05_disc']=0
j=pd.concat([j[j.key!='3I'],r3],ignore_index=True).set_index('key',drop=False)
S=[('2025 LS2','farthest-reliable','Rubin find that swings out ~1,000 au from the Sun (≈12,000-yr orbit)'),
('2026 EB130','farthest-candidate','If confirmed, travels ~4,700 au out; orbit from only 13 days of data'),
('2025 NE552','largest-new','Brightest (biggest) Rubin TNO find, maybe ~600 km (albedo guess); dwarf-planet size candidate'),
('2026 BS14','largest-new + tilted','Big (~500–650 km est.) world tilted 54°'),
('2026 FQ35','most-inclined-new','Most tilted Rubin TNO: ~60° to the planets'),
('2026 GN18','sentry','Rubin-found ~0.7 km NEO on JPL Sentry (1-in-72-million, 2054-2118), 4-day arc'),
('2025 OX529','biggest-new-NEO','~1 km Amor NEO, 3-day arc'),
('2025 PQ124','well-known-new-NEO','Rubin NEO with precoveries to 2004 (cc 2) – safe to plot'),
('2025 OC338','tiniest-new','~8 m rock; orbit passes 0.005 au (2 LD) from Earth\'s orbit'),
('2025 OP161','closest-to-Sun-new','Rubin NEO dipping inside Venus\'s orbit (q 0.66 au), 28° tilt, 335-d arc'),
('2025 OD43','earth-like-orbit-new','Rubin NEO with a≈1.04 au – a year almost exactly like Earth\'s'),
('2025 MU34','new-NEO','Rubin NEO with 97 X05 detections'),
('2026 N2','new-comet','Encke-type comet flagged as X05 discovery (precovered to 2021)'),
('2025 MP34','trojan-new','Rubin Jupiter Trojan sharing Jupiter\'s orbit (cc 1)'),
('2025 NE203','centaur-new','Rubin Centaur roaming near Neptune (a≈30 au)'),
('2025 PN7','quasi-satellite','Earth\'s quasi-moon (not a Rubin discovery; imaged by X05)'),
('2025 N1','interstellar','3I/ATLAS – interstellar comet imaged by Rubin Jul 2025 (not discovered)'),
('434620','retrograde','Orbits backwards (i=172°) – observed by X05'),
('2025 KF49','retrograde','Centaur on a 109° backwards orbit – observed by X05'),
('289227','closest-to-Sun','Gets within 0.13 au of the Sun (1/3 of Mercury\'s distance) – observed by X05'),
('1999 SF10','fastest-spin','Spins once every ~2.5 minutes – observed by X05'),
('535844','upcoming-flyby','PHA, 9.2 LD on 2027-03-04; spins in 5.6 min'),
('2025 MN88','upcoming-flyby','~20 m rock passing 7.9 LD on 2027-07-11 (returns 2029/2033/2035)'),
('2018 BY6','upcoming-flyby','Passes 5.0 LD on 2029-07-15'),
('25629','slowest-spin','One rotation takes ~172 days – observed by X05')]
rows=[]
for k,tag,why in S:
    r=j.loc[k] if k in j.index else None
    if isinstance(r,pd.DataFrame): r=r.iloc[0]
    rows.append(dict(key=k,tag=tag,why=why,full_name=r.full_name,group=r.group,rubin_new=bool(r.rubin_new),a=r.a,e=r.e,i=r.i,q=r.q,Q=r.ad,H=r.H,D_est_km=round(float(r.D_est_km),3) if pd.notna(r.D_est_km) else None,rot_h=r.rot_per,cc=r.condition_code,arc_d=r.data_arc,x05_nobs=int(r.nobs)))
st=pd.DataFrame(rows); st.to_csv('standouts.csv',index=False); print(st.drop(columns=['why']).to_string())
# sample curated json
N=j[j.rubin_new].copy(); cc=pd.to_numeric(N.condition_code,errors='coerce')
def obj(r,tag=None,why=None):
    return {"id":r.pdes,"name":r.full_name.strip(),"group":r.group,"rubinDiscovered":bool(r.rubin_new),"tags":[tag] if tag else [],"blurb":why,
      "elements":{"epochJD":float(r.epoch),"a":r.a,"e":r.e,"i":r.i,"om":r.om,"w":r.w,"ma":r.ma,"q":r.q},
      "H":r.H,"diameterKm":{"value":round(float(r.D_est_km),3),"estimated":bool(pd.isna(r.diameter))},"rotationHours":None if pd.isna(r.rot_per) else r.rot_per,
      "neo":r.neo=='Y',"pha":r.pha=='Y',"orbitQuality":{"conditionCode":int(r.condition_code) if str(r.condition_code).isdigit() else None,"arcDays":r.data_arc,"plotSafe":bool(str(r.condition_code).isdigit() and int(r.condition_code)<=5 and r.data_arc>=30)}}
out={"generated":"2026-09-28","source":{"obs":"Asteroid Institute MPC X05 export","elements":"JPL SBDB"},
 "stats":{"x05ObjectsObserved":int(len(j)),"x05DiscoveryFlags":int((j.x05_disc==1).sum()),"rubinDiscovered":int(len(N)),"plotSafe":int(((cc<=5)&(N.data_arc>=30)).sum()),
  "byGroup":N.group.value_counts().to_dict(),"byMonth":pd.read_csv('rubin_new_discoveries_by_month.csv').set_index('t').iloc[:,0].to_dict()},
 "objects":[obj(j.loc[r.key] if not isinstance(j.loc[r.key],pd.DataFrame) else j.loc[r.key].iloc[0],r.tag,r.why) for r in st.itertuples()]}
json.dump(out,open('rubin_recent.sample.json','w'),indent=1,default=lambda v: None if pd.isna(v) else v.item() if hasattr(v,'item') else str(v))
import os; print(os.path.getsize('rubin_recent.sample.json'))
