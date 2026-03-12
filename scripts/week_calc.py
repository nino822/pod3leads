import csv, urllib.request
from datetime import datetime, timedelta

url='https://docs.google.com/spreadsheets/d/1VIVL1rMYhYRsLZYxqgPGzX1LWpZnvpF0s3p5_eGRKKU/gviz/tq?tqx=out:csv&sheet=Leads%20Tracking'
rows=list(csv.reader(urllib.request.urlopen(url).read().decode('utf-8-sig').splitlines()))

# week helper from lib/week.ts

def get_week_bounds(week, year=2026):
    if week==1:
        return datetime(year-1,12,29), datetime(year,1,4)
    week_two_start=datetime(year,1,5)
    start=week_two_start + timedelta(days=(week-2)*7)
    end=start + timedelta(days=6)
    return start, end

# parse header rows
currentWeek=0
foundFirstHeader=False
currentHeaderDates=[]
week_totals={}

for i,row in enumerate(rows):
    clientHeader=row[1].strip().lower() if len(row)>1 else ''
    if clientHeader=='client':
        headerDates=[]
        foundDate=False
        for col in range(9,len(row)):
            raw=row[col].strip()
            if not raw:
                if foundDate:
                    break
                continue
            try:
                parsed=datetime.strptime(raw, '%m/%d/%y')
            except ValueError:
                try:
                    parsed=datetime.strptime(raw, '%m/%d/%Y')
                except ValueError:
                    if foundDate:
                        break
                    continue
            headerDates.append((col, parsed))
            foundDate=True
        if not headerDates:
            continue
        currentHeaderDates=headerDates
        if not foundFirstHeader:
            foundFirstHeader=True
            currentWeek=1
        else:
            currentWeek+=1
        continue
    if currentWeek==0:
        continue
    if len(row)<=1:
        continue
    client=row[1]
    total=sum(int(row[col]) if col < len(row) and row[col].isdigit() else 0 for col in range(9, len(row)))
    weeklyTotal=int(row[16]) if len(row)>16 and row[16].isdigit() else 0
    weekStart, weekEnd = get_week_bounds(currentWeek)
    overlapping=[col for col,date in currentHeaderDates if weekStart<=date<=weekEnd]
    overlappingSum=sum(int(row[col]) if row[col].isdigit() else 0 for col in overlapping)
    headerSum=sum(int(row[col]) if row[col].isdigit() else 0 for col,_ in currentHeaderDates)
    if overlappingSum>0:
        weeklyLeads=overlappingSum
    elif weeklyTotal>0:
        weeklyLeads=weeklyTotal
    elif headerSum>0:
        weeklyLeads=headerSum
    else:
        weeklyLeads=weeklyTotal
    week_totals.setdefault(currentWeek,0)
    week_totals[currentWeek]+=weeklyLeads
print('overall',week_totals)

# Pod 3 only totals
currentWeek=0
foundFirstHeader=False
currentHeaderDates=[]
pod_totals={}
for i,row in enumerate(rows):
    clientHeader=row[1].strip().lower() if len(row)>1 else ''
    if clientHeader=='client':
        headerDates=[]
        foundDate=False
        for col in range(9,len(row)):
            raw=row[col].strip()
            if not raw:
                if foundDate:
                    break
                continue
            try:
                parsed=datetime.strptime(raw, '%m/%d/%y')
            except ValueError:
                try:
                    parsed=datetime.strptime(raw, '%m/%d/%Y')
                except ValueError:
                    if foundDate:
                        break
                    continue
            headerDates.append((col, parsed))
            foundDate=True
        if not headerDates:
            continue
        currentHeaderDates=headerDates
        if not foundFirstHeader:
            foundFirstHeader=True
            currentWeek=1
        else:
            currentWeek+=1
        continue
    if currentWeek==0:
        continue
    if len(row)<=6:
        continue
    if row[6].strip().lower()!='pod 3':
        continue
    weeklyTotal=int(row[16]) if len(row)>16 and row[16].isdigit() else 0
    weekStart,weekEnd=get_week_bounds(currentWeek)
    overlapping=[col for col,date in currentHeaderDates if weekStart<=date<=weekEnd]
    overlappingSum=sum(int(row[col]) if row[col].isdigit() else 0 for col in overlapping)
    headerSum=sum(int(row[col]) if row[col].isdigit() else 0 for col,_ in currentHeaderDates)
    if overlappingSum>0:
        weeklyLeads=overlappingSum
    elif weeklyTotal>0:
        weeklyLeads=weeklyTotal
    elif headerSum>0:
        weeklyLeads=headerSum
    else:
        weeklyLeads=weeklyTotal
    pod_totals.setdefault(currentWeek,0)
    pod_totals[currentWeek]+=weeklyLeads
print('pod3', pod_totals)
